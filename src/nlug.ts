import { Move } from "./types";

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
      content: `favorite_food pizza`,
    },
    "Pizza.",
  ],
];

function deepEqual(obj1, obj2) {
    if (obj1 === obj2) {
        return true; // same reference or both are null/undefined
    }

    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
        return false; // primitive values or one of them is null
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
        return false; // different number of properties
    }

    for (let key of keys1) {
        if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
            return false; // different properties or values
        }
    }

    return true;
}

export function nlg(move: Move | null): string {
  console.log("generating...", move);
  const mapping = nlgMapping.find(
    (x) => deepEqual(x[0], move),
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
