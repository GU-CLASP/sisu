import { setup, createActor, sendTo } from "xstate";
import { describe, expect, it, beforeEach } from "vitest";
import { DMEContext, DMEEvent } from "../src/types";
import { dme } from "../src/dme";
import { nlu, nlg } from "../src/nlug";

interface Turn {
  speaker: string;
  message: string;
}

describe("DME tests", () => {
  let dialogue: Turn[] = [];

  const machine = setup({
    actors: {
      dme: dme,
    },
    actions: {
      notify: (_, params: { speaker: string; message: string }) => {
        dialogue.push({ speaker: params.speaker, message: params.message });
      },
    },
    types: {} as {
      context: DMEContext;
      events: DMEEvent | { type: "INPUT"; value: string };
    },
  }).createMachine({
    context: {
      parentRef: null,
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
    },
    initial: "DME",
    type: "parallel",
    states: {
      TestInterface: {
        on: {
          INPUT: {
            actions: [
              {
                type: "notify",
                params: ({ event }) => ({
                  speaker: "usr",
                  message: event.value,
                }),
              },
              sendTo(
                "dmeTestID",
                ({ event }) => ({
                  type: "SAYS",
                  value: {
                    speaker: "usr",
                    move: nlu(event.value),
                  },
                }),
                { delay: 1000 },
              ),
            ],
          },
          NEXT_MOVE: {
            actions: {
              type: "notify",
              params: ({ event }) => ({
                speaker: "sys",
                message: nlg(event.value),
              }),
            },
          },
        },
      },
      DME: {
        invoke: {
          src: "dme",
          id: "dmeTestID",
          input: ({ context, self }) => {
            return {
              parentRef: self,
              latest_move: context.latest_move,
              latest_speaker: context.latest_speaker,
              is: context.is,
            };
          },
        },
      },
    },
  });

  beforeEach(() => {
    dialogue = [];
  });

  it("does some basic dialogue", async () => {
    const actor = createActor(machine).start();
    const expectedDialogue = [
      { speaker: "sys", message: "Hello! You can ask me anything!" },
      { speaker: "usr", message: "What's your favorite food?" },
      { speaker: "sys", message: "Pizza." },
    ];
    expectedDialogue.forEach((turn, index) => {
      if (turn.speaker === "usr") {
        actor.send({ type: "INPUT", value: turn.message });
      }
      expect.poll(() => dialogue).toEqual(expectedDialogue.slice(0, index + 1));
    });
  });
});
