import { Move } from "./types";
import { objectsEqual, WHQ } from "./utils";

interface NLUMapping {
  [index: string]: Move[];
}
type NLGMapping = [Move, string][];

const nluMapping: NLUMapping = {
  "where is the lecture?": [
    {
      type: "ask",
      content: WHQ("booking_room"),
    },
  ],
  "what's your favorite food?": [
    {
      type: "ask",
      content: WHQ("favorite_food"),
    },
  ],
  pizza: [
    {
      type: "answer",
      content: "pizza",
    },
  ],
  "dialogue systems 2": [
    { type: "answer", content: { predicate: "booking_course", argument: "dialogue systems 2" } }
  ],
  "dialogue systems": [
    { type: "answer", content: { predicate: "booking_course", argument: "dialogue systems 2" } }
  ],
  "friday":[
    { type: "answer", content: { predicate: "booking_day", argument: "friday" } },
  ],
  "tuesday":[
    { type: "answer", content: { predicate: "booking_day", argument: "tuesday" }}
  ],
   "*no_input*": [
    { type: "no_input", content: null,}
  ]
  
};
const nlgMapping: NLGMapping = [
  [{ type:"ask", content: WHQ("booking_day") }, "Which day?" ],
  [{ type: "ask", content: WHQ("booking_course") }, "Which course?"],
  [{ type: "greet", content: null }, "Hello! You can ask me anything!"],
  [
    {
      type: "answer",
      content: { predicate: "favorite_food", argument: "pizza" },
    },
    "Pizza.",
  ],
  [
    {
      type: "answer",
      content: { predicate: "booking_room", argument: "G212" },
    },
    "Dialogue systems 2 on Friday is in G212.",
  ],
  [
    {
      type: "answer",
      content: { predicate: "booking_room", argument: "J440" },
    },
    "Dialogue systems 2 on Tuesday is in J440.",
  ],
  [{ 
    type: "dorepeat", 
    content: null 
  }, 
  "I didn't hear anything from you."],
];

export function nlg(moves: Move[]): string {
  console.log("generating moves", moves);

  function generateMove(move: Move): string {
    if (move.type === "no_input") {
      return move.content ?? "";
    }
    
    const mapping = nlgMapping.find((x) => objectsEqual(x[0], move));
    if (mapping) return mapping[1];

    throw new Error(`Failed to generate move ${JSON.stringify(move)}`);
  }
  const utterance = moves.map(generateMove).join(" ");
  console.log("generated utterance:", utterance);
  return utterance;
}

/** NLU mapping function can be replaced by statistical NLU
 */
export function nlu(utterance: string): Move[] {
  return nluMapping[utterance.toLowerCase()] || [];
}