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
        }
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
                { delay: 1000 }
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
                { delay: 1000 }
              ),
              {
                type: "notify",
                params: ({ event }: any) => ({
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
        }
      );
      expect(snapshot.context.dialogue).toEqual(expectedSoFar);
    });
  };

  //NOTE ON TESTS
  //Tests 5, 6 and 7 are test cases for 2C and 3. I had previously written solutions for them in the code,
  //but I removed them after I kept getting errors that were unexplainable to me. I tried implementing 2C
  //by adding a counter for silences from the user in the IS, and updating that throughout the dialog. 
  //This updating and incrementing was quite confusing, and I though it be best to hand in the assignment 
  //and discuss the VG parts later.

  //test 1

  //passes

  describe("Test 1: system answer from beliefs", () => {
    runTest([
      { speaker: "sys", message: "Hello! You can ask me anything!" },
      { speaker: "usr", message: "What's your favorite food?" },
      { speaker: "sys", message: "Pizza." },
    ]);
  });
 

  //test 2

  //passes

  describe("Test 2: system answer from database", () => {
    runTest([
      { speaker: "sys", message: "Hello! You can ask me anything!" },
      { speaker: "usr", message: "Where is the lecture?" },
      { speaker: "sys", message: "Which day?" },
      { speaker: "usr", message: "Friday" },
      { speaker: "sys", message: "Which course?" },
      { speaker: "usr", message: "Dialogue Systems 2" },
      { speaker: "sys", message: "The lecture is in G212." },
    ]);
  })

  //test 3

  //passes

  describe("Test 3: Negative system contact feedback", () => {
    runTest([
      { speaker: "sys", message: "Hello! You can ask me anything!" },
      { speaker: "usr", message: "*no_input*" },
      { speaker: "sys", message: "I didn't hear anything from you." },
    ]);
  });

  //test 4

  //passes

  describe("test 4: system answer from database, day + course, no input", () => {
    runTest([
      { speaker: "sys", message: "Hello! You can ask me anything!" },
      { speaker: "usr", message: "Where is the lecture?" },
      { speaker: "sys", message: "Which day?" },
      { speaker: "usr", message: "*no_input*" },
      { speaker: "sys", message: "I didn't hear anything from you. Which day?" },
      { speaker: "usr", message: "Thursday" },
      { speaker: "sys", message: "Which course?" }, 
      { speaker: "usr", message: "Dialogue Systems 2" }, 
      { speaker: "sys", message: "The lecture is in J440." }, 
    ]);
  })

 //test 5

 //VG test, fails

  describe("Test 5: Negative system contact feedback, no_input, repeated questions", () => {
  runTest([
    { speaker: "sys", message: "Hello! You can ask me anything!" },
    { speaker: "usr", message: "*no_input*" },
    { speaker: "sys", message: "I didn't hear anything from you." },
    { speaker: "usr", message: "*no_input*" },
    //{ speaker: "sys", message: "I didn't hear anything from you." },
    //{ speaker: "usr", message: "*no_input*" }, //fails if this is uncommented.
    { speaker: "sys", message: "On Friday, the lecture for Dialogue Systems 2 is in G212\nOn Thursday, the lecture is in J440." },
  ]);
});

  //test 6

  //VG test, fails

  describe("Test 6: Negative system contact feedback, no_input, repeated questions", () => {
  runTest([
    { speaker: "sys", message: "Hello! You can ask me anything!" },
    { speaker: "usr", message: "Where is the lecture?" },
    { speaker: "sys", message: "Which day?" },
    { speaker: "usr", message: "Thursday" },
    { speaker: "sys", message: "Which course?" },
    { speaker: "usr", message: "*no_input*" }, 
    { speaker: "sys", message: "I didn't hear anything from you. Which course?" },
    { speaker: "usr", message: "*no_input*" }, 
    { speaker: "sys", message: "I didn't hear anything from you. Which course?" },
    { speaker: "usr", message: "*no_input*" }, 
    { speaker: "sys", message: "On Friday, the lecture for Dialogue Systems 2 is in G212\nOn Thursday, the lecture is in J440." },
  ]);
});

//test 7

//VG test, fails

  describe("Test 7: Negative system contact feedback, no_input, repeated questions", () => {
  runTest([
    { speaker: "sys", message: "Hello! You can ask me anything!" },
    { speaker: "usr", message: "Where is the lecture?" },
    { speaker: "sys", message: "Which day?" },
    { speaker: "usr", message: "*no_input*" },
    { speaker: "sys", message: "I didn't hear anything from you. Which day?" },
    { speaker: "usr", message: "*no_input*" },
    { speaker: "sys", message: "I didn't hear anything from you. Which day?" },
    { speaker: "usr", message: "*no_input*" },
    { speaker: "sys", message: "On Friday, the lecture for Dialogue Systems 2 is in G212\nOn Thursday, the lecture is in J440." },
  ]);
});
});

