import { Move } from "./types";
import { objectsEqual} from "./utils";

interface NLUMapping {
  [index: string]: Move;
}
type NLGMapping = [Move, string][];

const nluMapping: NLUMapping = {
  "Where is the lecture?": {
    type: "ask",
    content: (x) => ({"predicate": "booking_room", "argument": x}),
  },
  "What's your favorite food?": {
    type: "ask",
    content: (x) => ({"predicate": "favorite_food", "argument": x}),
  },
  "Pizza": {
    type: "answer",
    content: "pizza",
  },
  "Dialogue Systems 2": {
    type: "answer",
    content: "LT2319",
  },
};
const nlgMapping: NLGMapping = [
  [
    {
      "type": "ask",
      "content": (x) => ({"predicate": "booking_course", "argument": x})
    },
    "Which course?",
  ],
  [
    {
      type: "greet",
      content: null,
    },
    "Hello! You can ask me anything!",
  ],
  [
    {
      type: "answer",
      content: {"predicate": "favorite_food", "argument": "pizza"},
    },
    "Pizza.",
  ],
];

export function nlg(move: Move | null): string {
  console.log("generating...", move);
  const mapping = nlgMapping.find(
    (x) => objectsEqual(x[0], move),
  );
  if (mapping) {
    return mapping[1];
  }
  return "";
}

/** NLU mapping function can be replaced by statistical NLU
 */
export function nlu(utterance: string): Move {
  return (
    nluMapping[utterance] || {
      type: "unknown",
      content: "",
    }
  );
}
