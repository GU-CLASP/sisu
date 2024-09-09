import { Move } from "./types";
import { objectsEqual, WHQ } from "./utils";

interface NLUMapping {
  [index: string]: Move;
}
type NLGMapping = [Move, string][];

const nluMapping: NLUMapping = {
  "where is the lecture?": {
    type: "ask",
    content: WHQ("booking_room"),
  },
  "what's your favorite food?": {
    type: "ask",
    content: WHQ("favorite_food"),
  },
  "pizza": {
    type: "answer",
    content: "pizza",
  },
  "dialogue systems 2": {
    type: "answer",
    content: "LT2319",
  },
  "dialogue systems": {
    type: "answer",
    content: "LT2319",
  },
};
const nlgMapping: NLGMapping = [
  [
    {
      "type": "ask",
      "content": WHQ("booking_course"),
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
    nluMapping[utterance.toLowerCase()] || {
      type: "unknown",
      content: "",
    }
  );
}
