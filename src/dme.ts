import { setup, assign, sendTo, AnyTransitionConfig } from "xstate";
import { rules } from "./rules";
import { SaysMovesEvent, DMEEvent, DMEContext } from "./types";

/**
 * Creates a transition with a guarded ISU.
 *
 * @param nextState Target state.
 * @param ruleName Name of ISU rule.
 * @param [sendBackNextMoves=false] If `true`, communicate next move to the parent machine.
 */
function isuTransition(
  nextState: string,
  ruleName: string,
  sendBackNextMoves: boolean = false
): AnyTransitionConfig {
  return {
    target: nextState,
    guard: { type: "isu", params: { name: ruleName } },
    actions: [{ type: "isu", params: { name: ruleName } }],
  };
}

export const dme = setup({
  types: {} as {
    input: DMEContext;
    context: DMEContext;
    events: DMEEvent;
  },
  guards: {
    isu: ({ context }, params: { name: string }) =>
      !!rules[params.name](context),
    latestSpeakerIsUsr: ({ context }) => {
      return context.latest_speaker == "usr";
    },
  },
  actions: {
    sendBackNextMoves: sendTo(
      ({ context }) => context.parentRef,
      ({ context }) => {
        return {
          type: "NEXT_MOVES",
          value: context.is.next_moves,
        };
      }
    ),
    isu: assign(({ context }, params: { name: string }) => {
      let ruleName = params.name;
      let newIS = rules[ruleName](context)!(); // we assume that this is never called without a guard
      console.info(`[ISU ${ruleName}]`);
      console.dir(newIS, { depth: null, colors: true });
      return { is: newIS };
    }),
    updateLatestMoves: assign(({ context, event }) => {
      console.info("[DM updateLatestMoves]");
      console.dir(event, { depth: null, colors: true });
      return {
        latest_moves: (event as SaysMovesEvent).value.moves,
        latest_speaker: (event as SaysMovesEvent).value.speaker,
        is: {
          ...context.is,
          next_moves: [],
        },
      };
    }),
  },
}).createMachine({
  context: ({ input }) => {
    return input;
  },
  initial: "Select",
  states: { // Two BIG BOY states: 1) Select, 2) Update
    Select: { // “decide what I (the system) will say next.”
      initial: "SelectAction",
      states: {
        SelectAction: { // “What kind of thing should I do next?”
          always: [ // lways: [ ... ] block means: as soon as we enter this state, immediately evaluate these transitions in order.
            isuTransition("SelectMove", "select_respond"), //select_respond → If there’s a question under discussion (QUD) and the system knows something relevant, prepare a respond action.
            isuTransition("SelectMove", "select_from_plan"), // 2.	select_from_plan → If there’s something in the current plan, copy the first step to the agenda.
            { target: "SelectMove" }, { target: "SelectMove" } // → default fallback — if nothing matched, just move on (needed for greetings etc.).
          ], // So, SelectAction picks a rule to fire, and then hands control to SelectMove, which decides what move to produce.
        },
        SelectMove: { // 	•	SelectMove → choose a rule that turns that agenda into a move (an actual utterance).
          always: [
            isuTransition("SelectionDone", "select_negative_understanding"), // To activate the no input rule
            isuTransition("SelectionDone", "select_ask"),
            isuTransition("SelectionDone", "select_answer"),
            isuTransition("SelectionDone", "select_other"),
            { target: "SelectionDone" },
          ],
        },
        SelectionDone: { // SelectionDone → send the next_moves back up to the parent machine (sendBackNextMoves).
          always: [{ actions: [{ type: "sendBackNextMoves" }] }],
          type: "final",
        },
      },
      onDone: "Update",
    },
    Update: { // “process what you (the user) just said and adjust my memory.”
      initial: "Init",
      states: {
        Init: { // 	Init → clears the old agenda.
          always: isuTransition("Grounding", "clear_agenda"),
        },
        Grounding: {
          /*	•	Grounding → waits for SAYS (someone spoke). when it happens, it runs
	              •	updateLatestMoves → store what was said,
	              •	get_latest_move → move it into the shared memory.
          */
          on: {
            SAYS: {
              target: "Integrate",
              actions: [
                {
                  type: "updateLatestMoves",
                },
                { type: "isu", params: { name: "get_latest_move" } },
              ],
            },
          },
        },
        Integrate: { // Integrate → figure out what kind of move it was (ask, answer, greet, etc.) and update the information state.
          always: [
            isuTransition("DowndateQUD", "integrate_usr_request"),
            isuTransition("DowndateQUD", "integrate_sys_ask"),
            isuTransition("DowndateQUD", "integrate_usr_ask"),
            isuTransition("DowndateQUD", "integrate_answer"),
            isuTransition("DowndateQUD", "integrate_greet"),
            { target: "DowndateQUD" },
          ],
        },
        DowndateQUD: { // DowndateQUD → remove any questions that are now answered; or look for a plan that handles the new situation.
          always: [
            isuTransition("LoadPlan", "downdate_qud"),
            isuTransition("LoadPlan", "find_plan"),
            { target: "LoadPlan" },
          ],
        },
        LoadPlan: {
          always: { target: "ExecPlan" },
        },
        ExecPlan: { //	•	LoadPlan → ExecPlan → perform internal steps like consulting the database, removing resolved actions.
          always: [
            isuTransition("ExecPlan", "remove_findout"),
            isuTransition("ExecPlan", "exec_consultDB"),
            { target: "FinalGroup" },
          ],
        },
        FinalGroup: {
          type: "final",
        },
      },
      onDone: [
        {
          target: "Select",
          guard: "latestSpeakerIsUsr",
        },
        { target: "Update" },
      ],
    },
  },
});
