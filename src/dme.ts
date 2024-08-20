import { setup, assign, sendTo, AnyTransitionConfig } from "xstate";
import { rules } from "./rules";
import { SaysMoveEvent, DMEEvent, DMEContext } from "./types";

function isuTransition(
  nextState: string,
  ruleName: string,
  nextMove: boolean,
): AnyTransitionConfig {
  return {
    target: nextState,
    guard: { type: "isu", params: { name: ruleName } },
    actions: nextMove
      ? [
          { type: "isu", params: { name: ruleName } },
          { type: "sendBackNextMove" },
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
      rules[params.name](context).preconditions,
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
    isu: assign(({ context }, params: { name: string }) => {
      return { is: rules[params.name](context).effects };
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
  states: {
    Select: {
      initial: "SelectAction",
      states: {
        SelectAction: {
          always: [
            isuTransition("SelectMove", "select_respond", false),
            isuTransition("SelectMove", "select_from_plan", false),
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
          always: isuTransition("Grounding", "clear_agenda", false),
        },
        Grounding: {
          // TODO: rename to Perception?
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
            isuTransition("DowndateQUD", "integrate_usr_request", false),
            isuTransition("DowndateQUD", "integrate_sys_ask", false),
            isuTransition("DowndateQUD", "integrate_usr_ask", false),
            isuTransition("DowndateQUD", "integrate_greet", false),
          ],
        },
        DowndateQUD: {
          always: [
            isuTransition("LoadPlan", "downdate_qud", false),
            { target: "LoadPlan" },
          ],
        },
        LoadPlan: {
          always: { target: "ExecPlan" },
        },
        ExecPlan: {
          type: "final",
        },
      },
      onDone: {
        target: "Select",
      },
    },
  },
});
