import { setup, createActor, sendTo, assign, waitFor } from "xstate";
import { describe, expect, test } from "vitest";
import { DMEContext, DMEEvent, NextMovesEvent } from "../src/types";
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
      notify: assign(
        ({ context }, params: { speaker: string; message: string }) => {
          return { dialogue: [...context.dialogue, params] };
        },
      ),
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
                    moves: nlu(event.value),
                  },
                }),
                { delay: 1000 },
              ),
            ],
          },
          NEXT_MOVES: {
            actions: [
              sendTo(
                "dmeTestID",
                ({ event }) => ({
                  type: "SAYS",
                  value: {
                    speaker: "sys",
                    moves: (event as NextMovesEvent).value,
                  },
                }),
                { delay: 1000 },
              ),
              {
                type: "notify",
                params: ({ event }) => ({
                  speaker: "sys",
                  message: nlg(event.value),
                }),
                delay: 2000,
              },
            ],
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
              latest_moves: context.latest_moves,
              latest_speaker: context.latest_speaker,
              is: context.is,
            };
          },
        },
      },
    },
  });

  const runTest = (turns: Turn[]) => {
    let expectedSoFar: Turn[] = [];
    const actor = createActor(machine).start();
    test.each(turns)("$speaker> $message", async (turn) => {
      expectedSoFar.push(turn);
      if (turn.speaker === "usr") {
        console.info("user input: ", turn.message);
        actor.send({ type: "INPUT", value: turn.message });
      }
      const snapshot = await waitFor(
        actor,
        (snapshot) => snapshot.context.dialogue.length === expectedSoFar.length,
        {
          timeout: 1000 /** allowed time to transition to the expected state */,
        },
      );
      expect(snapshot.context.dialogue).toEqual(expectedSoFar);
    });
  };

  describe("system answer from beliefs", () => {
    runTest([
      { speaker: "sys", message: "Hello! You can ask me anything!" },
      { speaker: "usr", message: "What's your favorite food?" },
      { speaker: "sys", message: "Pizza." },
    ]);
  });

  // BEFORE OF LAB 1
  // describe("system answer from database", () => {
  //   runTest([
  //     { speaker: "sys", message: "Hello! You can ask me anything!" },
  //     { speaker: "usr", message: "Where is the lecture?" },
  //     { speaker: "sys", message: "Which course?" },
  //     { speaker: "usr", message: "Dialogue Systems 2" },
  //     { speaker: "sys", message: "The lecture is in G212." },
  //   ]);
  // });


  // LAB 1
  describe("system answer depends on day", () => {
    runTest([
      { speaker: "sys", message: "Hello! You can ask me anything!" },
      { speaker: "usr", message: "Where is the lecture?" },
      { speaker: "sys", message: "Which day?" },
      { speaker: "usr", message: "Friday" },
      { speaker: "sys", message: "Which course?" },
      { speaker: "usr", message: "Dialogue Systems 2" },
      { speaker: "sys", message: "The lecture is in G212." },
    ]);
    runTest([
      { speaker: "sys", message: "Hello! You can ask me anything!" },
      { speaker: "usr", message: "Where is the lecture?" },
      { speaker: "sys", message: "Which day?" },
      { speaker: "usr", message: "Tuesday" },
      { speaker: "sys", message: "Which course?" },
      { speaker: "usr", message: "Dialogue Systems 2" },
      { speaker: "sys", message: "The lecture is in J440." },
    ]);
  });

  describe("Negative system contact feedback", () => {
    runTest([
      { speaker: "sys", message: "Hello! You can ask me anything!" },
      { speaker: "usr", message: "*no_input*" },
      { speaker: "sys", message: "I didn't hear anything from you." },
    ]);
  });
  

  describe("Repeated no-input provides answer (Task 2c)", () => {
    runTest([
      { speaker: "sys", message: "Hello! You can ask me anything!" },
      { speaker: "usr", message: "Where is the lecture?" },
      { speaker: "sys", message: "Which day?" },
      { speaker: "usr", message: "*no_input*" },
      { speaker: "sys", message: "I didn't hear anything from you. Which day?" },
      { speaker: "usr", message: "*no_input*" },
      { speaker: "sys", message: "I didn't hear anything from you. Which day?" },
      { speaker: "usr", message: "*no_input*" },
      // After 3 no-inputs, should provide answer instead of repeating question
      { speaker: "sys", message: "Which course?" }, // or provide room info if available
    ]);
  });

  
});
