import { assign, createActor, setup, AnyMachineSnapshot, raise } from "xstate";
import { speechstate } from "speechstate";
import { createBrowserInspector } from "@statelyai/inspect";
import { KEY } from "./azure";
import { DMContext, DMEvent } from "./types";
import { rules } from "./rules";
import { nlg, nlu } from "./nlug";

const inspector = createBrowserInspector();

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: KEY,
};

const settings = {
  azureCredentials: azureCredentials,
  asrDefaultCompleteTimeout: 0,
  asrDefaultNoInputTimeout: 5000,
  locale: "en-US",
  azureRegion: "northeurope",
  ttsDefaultVoice: "en-US-DavisNeural",
};

const dmMachine = setup({
  guards: {
    /** preconditions */
    isu: ({ context }, params: { name: string }) =>
      rules[params.name](context).preconditions,
  },
  actions: {
    /** effects */
    isu: assign(({ context }, params: { name: string }) => {
      return { is: rules[params.name](context).effects };
    }),
    /**  update latest_move (outside IS!) based on ASR/TTS (SAYS event) */
    updateLatestMove: assign(({ event }) => {
      console.debug("[DM updateLatestMove]", event);
      return {
        latest_move: event.value.move,
        latest_speaker: event.value.speaker,
      };
    }),
    /** TTS */
    speak_next_move: ({ context }) =>
      context.ssRef.send({
        type: "SPEAK",
        value: {
          utterance: nlg(context.is.next_move),
        },
      }),
    /** ASR */
    listen: ({ context }) =>
      context.ssRef.send({
        type: "LISTEN",
      }),
  },
  types: {} as {
    context: DMContext;
    event: DMEvent;
  },
}).createMachine({
  context: ({ spawn }) => {
    return {
      ssRef: spawn(speechstate, { input: settings }),
      is: {
        domain: [
          {
            type: "resolves",
            content: ["pizza", (x) => `favorite_food ${x}`],
          },
          {
            type: "resolves",
            content: ["favorite_food pizza", (x) => `favorite_food ${x}`],
          },
        ],
        next_move: null,
        private: {
          plan: [],
          agenda: [
            {
              type: "greet",
              content: null,
            },
          ],
          bel: ["favorite_food pizza"],
        },
        shared: { lu: undefined, qud: [], com: [] },
      },
    };
  },
  id: "DM",
  initial: "Prepare",
  states: {
    Prepare: {
      entry: ({ context }) => context.ssRef.send({ type: "PREPARE" }),
      on: { ASRTTS_READY: "WaitToStart" },
    },
    WaitToStart: {
      on: {
        CLICK: "Main",
      },
    },
    Main: {
      type: "parallel",
      states: {
        Interpret: {
          initial: "Idle",
          states: {
            Idle: {
              on: {
                SPEAK_COMPLETE: { target: "Recognising", actions: "listen" },
              },
            },
            Recognising: {
              on: {
                RECOGNISED: {
                  target: "Idle",
                  actions: raise(({ event }) => ({
                    type: "SAYS",
                    value: {
                      speaker: "usr",
                      move: nlu(event.value[0].utterance),
                    },
                  })),
                },
                ASR_NOINPUT: {
                  target: "Idle",
                  // FOR TESTING
                  actions: raise({
                    type: "SAYS",
                    value: {
                      speaker: "usr",
                      move: {
                        type: "ask",
                        content: (x: string) => `favorite_food ${x}`,
                      },
                    },
                  }),
                },
              },
            },
          },
        },
        Generate: {
          initial: "Idle",
          states: {
            Idle: {
              always: {
                target: "Speaking",
                guard: ({ context }) => !!context.is.next_move,
              },
            },
            Speaking: {
              entry: "speak_next_move",
              on: {
                SPEAK_COMPLETE: {
                  target: "Idle",
                  actions: [
                    raise(({ context }) => ({
                      type: "SAYS",
                      value: {
                        speaker: "sys",
                        move: context.is.next_move,
                      },
                    })),
                    assign(({ context }) => {
                      return { is: { ...context.is, next_move: null } };
                    }),
                  ],
                },
              },
            },
          },
        },
        DME: {
          initial: "Select",
          states: {
            Select: {
              entry: ({ context }) =>
                console.debug("[DM] ENTERING SELECT", context.is),
              initial: "SelectAction",
              states: {
                SelectAction: {
                  always: [
                    {
                      target: "SelectMove",
                      guard: {
                        type: "isu",
                        params: { name: "select_respond" },
                      },
                      actions: {
                        type: "isu",
                        params: { name: "select_respond" },
                      },
                    },
                    {
                      target: "SelectMove",
                      guard: {
                        type: "isu",
                        params: { name: "select_from_plan" },
                      },
                      actions: {
                        type: "isu",
                        params: { name: "select_from_plan" },
                      },
                    },
                    { target: "SelectMove" }, // TODO check it -- needed for greeting
                  ],
                },
                SelectMove: {
                  always: [
                    {
                      target: "SelectionDone",
                      guard: {
                        type: "isu",
                        params: { name: "select_ask" },
                      },
                      actions: {
                        type: "isu",
                        params: { name: "select_ask" },
                      },
                    },
                    {
                      target: "SelectionDone",
                      guard: {
                        type: "isu",
                        params: { name: "select_answer" },
                      },
                      actions: {
                        type: "isu",
                        params: { name: "select_answer" },
                      },
                    },
                    {
                      target: "SelectionDone",
                      guard: {
                        type: "isu",
                        params: { name: "select_other" },
                      },
                      actions: {
                        type: "isu",
                        params: { name: "select_other" },
                      },
                    },
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
                  always: {
                    target: "Grounding",
                    guard: { type: "isu", params: { name: "clear_agenda" } },
                    actions: { type: "isu", params: { name: "clear_agenda" } },
                  },
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
                    {
                      target: "DowndateQUD",
                      guard: {
                        type: "isu",
                        params: { name: "integrate_sys_ask" },
                      },
                      actions: {
                        type: "isu",
                        params: { name: "integrate_sys_ask" },
                      },
                    },
                    {
                      target: "DowndateQUD",
                      guard: {
                        type: "isu",
                        params: { name: "integrate_usr_ask" },
                      },
                      actions: {
                        type: "isu",
                        params: { name: "integrate_usr_ask" },
                      },
                    },
                    {
                      target: "DowndateQUD",
                      guard: {
                        type: "isu",
                        params: { name: "integrate_greet" },
                      },
                      actions: {
                        type: "isu",
                        params: { name: "integrate_greet" },
                      },
                    },
                  ],
                },
                DowndateQUD: {
                  always: [
                    {
                      target: "LoadPlan",
                      guard: {
                        type: "isu",
                        params: { name: "downdate_qud" },
                      },
                      actions: {
                        type: "isu",
                        params: { name: "downdate_qud" },
                      },
                    },
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
        },
      },
    },
  },
});

export const dmActor = createActor(dmMachine, {
  inspect: inspector.inspect,
}).start();

let is = dmActor.getSnapshot().context.is;
console.log("[IS (initial)]", is);
dmActor.subscribe((snapshot: AnyMachineSnapshot) => {
  /* if you want to log some parts of the state */
  // is !== snapshot.context.is && console.log("[IS]", snapshot.context.is);
  is = snapshot.context.is;
  // console.log("IS", is);
  console.log("%cState value:", "background-color: #056dff", snapshot.value);
});

export function setupButton(element: HTMLElement) {
  element.addEventListener("click", () => {
    dmActor.send({ type: "CLICK" });
  });
  dmActor
    .getSnapshot()
    .context.ssRef.subscribe((snapshot: AnyMachineSnapshot) => {
      element.innerHTML = `${Object.values(snapshot.getMeta())[0]["view"]}`;
    });
}

/**
sys> Hello! You can ask me anything!
{type: "greet", content: null}

usr> What's your favorite food?
{type: "ask", content: (x) => `favorite_food ${x}`}

sys> Pizza
{type: "respond", content: "pizza"}
 */
