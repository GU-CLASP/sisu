import { setup, createActor, sendTo, assign, waitFor } from "xstate";
import { describe, expect, test } from "vitest";
import { DMEContext, DMEEvent } from "../src/types";
import { dme } from "../src/dme";
import { nlu, nlg } from "../src/nlug";
import { initialIS } from "../src/is";

interface Turn {
  speaker: string;
  message: string;
}

interface TestContext extends DMEContext {
  dialogue: Turn[];
}

describe("DME tests", () => {
  const machine = setup({
    actors: {
      dme: dme,
    },
    actions: {
      notify: assign(({ context }, params: Turn) => {
        return { dialogue: [...context.dialogue, params] };
      }),
    },
    types: {} as {
      context: TestContext;
      events: DMEEvent | { type: "INPUT"; value: string };
    },
  }).createMachine({
    context: {
      dialogue: [],
      parentRef: null,
      is: initialIS(),
    },
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
    initial: "TestInterface",
    states: {
      TestInterface: {
        on: {
          INPUT: {
            actions: [
              ({ event }) => console.log("INPUT"),
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
                { delay: 2000 },
              ),
            ],
          },
          NEXT_MOVE: {
            actions: [
              ({ event }) => console.log("NEXT_MOVE"),
              sendTo(
                "dmeTestID",
                ({ event }) => ({
                  type: "SAYS",
                  value: {
                    speaker: "sys",
                    move: event.value,
                  },
                }),
                { delay: 2000 },
              ),
              {
                type: "notify",
                params: ({ event }) => ({
                  speaker: "sys",
                  message: nlg(event.value),
                }),
              },
            ],
          },
        },
      },
    },
  });

  const runTest = (turns: Turn[]) => {
    let expectedSoFar: Turn[] = [];
    const actor = createActor(machine).start();
    console.log(
      "%cState value:",
      "background-color: #056dff",
      actor.getSnapshot().children.dmeTestID?.getSnapshot().value,
    );
    actor.getSnapshot().children.dmeTestID?.subscribe((snapshot) => {
      snapshot;
      // console.log("IS", is);
      console.log(
        "%cState value:",
        "background-color: #056dff",
        snapshot.value,
        // snapshot.value,
        // snapshot.context.is,
      );
    });

    test.each(turns)("$speaker> $message", async (turn) => {
      expectedSoFar.push(turn);
      if (turn.speaker === "usr") {
        console.log("U>", turn);
        actor.send({ type: "INPUT", value: turn.message });
      }
      const snapshot = await waitFor(
        actor,
        (snapshot) => snapshot.context.dialogue.length === expectedSoFar.length,
        {
          timeout: 2000 /** allowed time to transition to the expected state */,
        },
      );
      expect(snapshot.context.dialogue).toEqual(expectedSoFar);
    });
  };

  describe("system answer from beliefs", () => {
    runTest([
      { speaker: "sys", message: "Hello! You can ask me anything!" },
      { speaker: "usr", message: "What's your favorite food?" },
      // { speaker: "sys", message: "Pizza." },
    ]);
  });

  describe.skip("system answer from database", () => {
    runTest([
      { speaker: "sys", message: "Hello! You can ask me anything!" },
      { speaker: "usr", message: "Where is the lecture?" },
      { speaker: "sys", message: "Which course?" },
      // { speaker: "usr", message: "Dialogue Systems 2" },
      // { speaker: "sys", message: "G212." },
    ]);
  });
});
