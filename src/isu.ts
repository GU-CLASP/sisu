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
          utterance: nlg(context.next_move),
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
      next_move: {
        type: "greet",
        content: null,
      },
      is: {
        private: {
          agenda: [
            {
              type: "greet",
              content: null,
            },
          ],
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
                guard: ({ context }) => !!context.next_move,
              },
            },
            Speaking: {
              entry: [
                raise(({ context }) => ({
                  type: "SAYS",
                  value: {
                    speaker: "sys",
                    move: context.next_move,
                  },
                })),
                "speak_next_move",
                assign({ next_move: null }),
              ],
              on: {
                SPEAK_COMPLETE: {
                  target: "Idle",
                },
              },
            },
          },
        },
        DME: {
          initial: "Update", // todo: shd be Select
          states: {
            Select: {},
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
                  on: {
                    SAYS: {
                      target: "Integrate",
                      actions: [
                        // () => console.log("<<got says>>"),
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
                  always: { target: "LoadPlan" },
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
usr> What's your favourite food?
{type: "ask", content: (x) => `favorite_food ${x}`}

sys> Pizza
{type: "respond", content: "pizza"}
 */
