import { setup, assign, sendTo, AnyTransitionConfig } from "xstate";
import { rules } from "./rules";
import { SaysMoveEvent, DMEEvent, DMEContext } from "./types";

/**
 * Creates a transition with a guarded ISU.
 *
 * @param nextState Target state.
 * @param ruleName Name of ISU rule.
 * @param [sendBackNextMove=false] If `true`, communicate next move to the parent machine.
 */
function isuTransition(
  nextState: string,
  ruleName: string,
  sendBackNextMove: boolean = false,
): AnyTransitionConfig {
  return {
    target: nextState,
    guard: { type: "isu", params: { name: ruleName } },
    actions: sendBackNextMove
      ? [
          { type: "isu", params: { name: ruleName } },
          { type: "sendBackNextMove" },
          { type: "clearNextMove" },
        ]
      : [{ type: "isu", params: { name: ruleName } }],
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
      rules[params.name](context, false).preconditions,
  },
  actions: {
    sendBackNextMove: sendTo(
      ({ context }) => context.parentRef,
      ({ context }) => {
        return {
          type: "NEXT_MOVE",
          value: context.is.next_move,
        };
      },
    ),
    clearNextMove: assign(({ context }) => {
      return {
        is: {
          ...context.is,
          next_move: null,
        },
      };
    }),
    isu: assign(({ context }, params: { name: string }) => {
      return { is: rules[params.name](context, true).result };
    }),
    updateLatestMove: assign(({ event }) => {
      console.debug("[DM updateLatestMove]", event);
      return {
        latest_move: (event as SaysMoveEvent).value.move,
        latest_speaker: (event as SaysMoveEvent).value.speaker,
      };
    }),
  },
}).createMachine({
  context: ({ input }) => {
    return input;
  },
  initial: "Select",
  on: {
    SAYS: {
      actions: ({ event }) =>
        console.error("RECEIVED SAYS, BUT NOT IN GROUNDING STATE", event.value),
    },
  },
  states: {
    Select: {
      initial: "SelectAction",
      states: {
        SelectAction: {
          always: [
            isuTransition("SelectMove", "select_respond"),
            isuTransition("SelectMove", "select_from_plan"),
            { target: "SelectMove" }, // TODO check it -- needed for greeting
          ],
        },
        SelectMove: {
          always: [
            isuTransition("SelectionDone", "select_ask", true),
            isuTransition("SelectionDone", "select_answer", true),
            isuTransition("SelectionDone", "select_other", true),
            { target: "SelectionDone" },
          ],
        },
        SelectionDone: { type: "final" },
      },
      onDone: "Update",
    },
    Update: {
      initial: "Init",
      states: {
        Init: {
          always: isuTransition("Grounding", "clear_agenda"),
        },
        Grounding: {
          // TODO: rename to Perception?
          entry: () => console.log("Ready to receive SAYS"),
          on: {
            SAYS: {
              target: "Integrate",
              actions: [
                {
                  type: "updateLatestMove",
                },
                { type: "isu", params: { name: "get_latest_move" } },
              ],
            },
          },
        },
        Integrate: {
          always: [
            isuTransition("DowndateQUD", "integrate_usr_request"),
            isuTransition("DowndateQUD", "integrate_sys_ask"),
            isuTransition("DowndateQUD", "integrate_usr_ask"),
            isuTransition("DowndateQUD", "integrate_answer"),
            isuTransition("DowndateQUD", "integrate_greet"),
          ],
        },
        DowndateQUD: {
          always: [
            isuTransition("LoadPlan", "downdate_qud"),
            isuTransition("LoadPlan", "find_plan"),
            { target: "LoadPlan" },
          ],
        },
        LoadPlan: {
          always: { target: "ExecPlan" },
        },
        ExecPlan: {
          always: [
            isuTransition("FinalGroup", "remove_findout"),
            isuTransition("FinalGroup", "exec_consultDB"),
            { target: "FinalGroup" },
          ],
        },
        FinalGroup: {
          type: "final",
        },
      },
      onDone: {
        target: "Select",
      },
    },
  },
});
