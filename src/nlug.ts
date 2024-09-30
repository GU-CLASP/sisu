import { Move } from "./types";
import { objectsEqual, WHQ } from "./utils";

interface NLUMapping {
  [index: string]: Move[];
}
type NLGMapping = [Move, string][];

const nluMapping: NLUMapping = {
  "where is the lecture?": [{
    type: "ask",
    content: WHQ("booking_room"),
  }],
  "what's your favorite food?": [{
    type: "ask",
    content: WHQ("favorite_food"),
  }],
  pizza: [{
    type: "answer",
    content: "pizza",
  }],
  "dialogue systems 2": [{
    type: "answer",
    content: "LT2319",
  }],
  "dialogue systems": [{
    type: "answer",
    content: "LT2319",
  }],
  monday: [{
    type: "answer",
    content: "monday",
  }],
  thursday: [{
    type: "answer",
    content: "thursday",
  }],
};
const nlgMapping: NLGMapping = [
  [{ type: "noNLU", content: null }, "Sorry, I don't understand."],
  [{ type: "ask", content: WHQ("booking_course") }, "Which course?"],
  [{ type: "ask", content: WHQ("course_day")}, "Which day?"],
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
    "The lecture is in G212.",
  ],
  [
    {
      type: "answer",
      content: { predicate: "booking_room", argument: "J440"},
    },
    "The lecture is in J440."
  ],
];

export function nlg(moves: Move[]): string {
    // if ( moves.length === 0) {
    //   return "no moves"
    // }
  console.log("generating moves", moves);
  function generateMove(move: Move): string {
    const mapping = nlgMapping.find((x) => objectsEqual(x[0], move));
    //console.log(`This is the the value for const mapping ${mapping}`)
    if (mapping) {
      //console.log(`This is the value of mapping[0] ${mapping[0]}`)
      //console.log(`This is the move ${move}`)
      //console.log(`This is the value of mapping[1] ${mapping[1]}`)
      //console.log(`Mapping of move type : ${move.type}`)
      //console.log(`This is the move stringified ${JSON.stringify(move)}`)
      return mapping[1];
    }
    if (mapping !== undefined) {
      //console.log(`Mapping of ${move.type} is undefined`);
      return mapping[1];
    }
    else {
      //console.log(`Mapping of ${move.type} not found`)
      throw new Error(`Failed to generate move ${JSON.stringify(move)}`);
    }
  }
  const utterance = moves.map(generateMove).join(' ');
  //console.log("generated utterance:", utterance);
  return utterance;
}

/** NLU mapping function can be replaced by statistical NLU
 */
export function nlu(utterance: string): Move[] {
  return nluMapping[utterance.toLowerCase()] || [];
}
