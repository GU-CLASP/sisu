import { Move } from "./types";

interface NLUMapping {
  [index: string]: Move;
}
type NLGMapping = [Move, string][];

const nluMapping: NLUMapping = {
  "What's your favorite food?": {
    type: "ask",
    content: (x) => `favorite_food ${x}`,
  },
  Pizza: {
    type: "answer",
    content: "pizza",
  },
};
const nlgMapping: NLGMapping = [
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
      content: `favorite_food pizza`,
    },
    "Pizza.",
  ],
];

export function nlg(move: Move | null): string {
  console.log("generating...", move);
  const mapping = nlgMapping.find(
    (x) => x[0].type === move!.type && x[0].content === move!.content,
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
