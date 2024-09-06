import { Move } from "./types";
import { objectsEqual} from "./utils";

interface NLUMapping {
  [index: string]: Move;
}
type NLGMapping = [Move, string][];

const nluMapping: NLUMapping = {
  "Create an appointment": {
    "type": "request",
    "content": "create_appointment"
  },
  "What's your favorite food?": {
    type: "ask",
    content: (x) => ({"predicate": "favorite_food", "argument": x}),
  },
  Pizza: {
    type: "answer",
    content: "pizza",
  },
};
const nlgMapping: NLGMapping = [
  [
    {
      "type": "ask",
      "content": {
        "type": "wh_question",
        "predicate": "meeting_person"
      }
    },
    "Who are you meeting with?",
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
