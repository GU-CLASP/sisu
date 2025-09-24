import { Move } from "./types";
import { objectsEqual, WHQ } from "./utils";

interface NLUMapping {
  [index: string]: Move[];
}
type NLGMapping = [Move, string][];

// --- NLU Mapping ---
const nluMapping: NLUMapping = {
  "where is the lecture?": [{ type: "ask", content: WHQ("booking_room") }],
  "what's your favorite food?": [{ type: "ask", content: WHQ("favorite_food") }],
  "pizza": [{ type: "answer", content: "pizza" }],
  "dialogue systems 2": [{ type: "answer", content: "LT2319" }],
  "friday": [{ type: "answer", content: "friday" }],
  "tuesday": [{ type: "answer", content: "tuesday" }],
  "*no_input*": [{ type: "no_input" }],
  // Add more variations for no input
  "no_input": [{ type: "no_input" }],
  "": [{ type: "no_input" }],
};

// --- NLG Mapping ---
const nlgMapping: NLGMapping = [
  [{ type: "greet", content: null }, "Hello! You can ask me anything!"],
  [{ type: "answer", content: { predicate: "favorite_food", argument: "pizza" } }, "Pizza."],
  [{ type: "answer", content: { predicate: "booking_room", argument: "G212" } }, "The lecture is in G212."],
  [{ type: "answer", content: { predicate: "booking_room", argument: "J440" } }, "The lecture is in J440."],
  [{ type: "ask", content: WHQ("booking_day") }, "Which day?"],
  [{ type: "ask", content: WHQ("booking_course") }, "Which course?"],
  [{ type: "no_input", content: null }, "I didn’t hear anything from you."],
  [{ type: "no_input", content: null, combined: true }, "I didn’t hear anything from you."],
  [{ type: "inform", content: "I didn't quite catch that. Could you repeat?" }, "I didn't quite catch that. Could you repeat?"],
  [{ type: "inform", content: "Please specify a weekday (e.g., Monday, Tuesday, etc.)" }, "Please specify a weekday (e.g., Monday, Tuesday, etc.)"],
  [{ type: "acknowledge", content: "Okay, got it." }, "Okay, got it."],
];

// --- NLG Function ---
export function nlg(moves: Move[]): string {
  console.log("[NLG DEBUG] Generating for moves:", moves);
  
  if (moves.length === 0) {
    console.log("[NLG DEBUG] Empty moves, returning empty string");
    return "";
  }
  
  // Handle single no_input move
  if (moves.length === 1 && moves[0].type === "no_input") {
    console.log("[NLG DEBUG] Single no_input detected");
    return "I didn't hear anything from you.";
  }
  
  // Handle combination of no_input and ask moves
  const noInputMove = moves.find(move => move.type === "no_input");
  const askMove = moves.find(move => move.type === "ask");
  
  if (noInputMove && askMove) {
    console.log("[NLG DEBUG] Combination of no_input and ask detected");
    const askMessage = nlgMapping.find(([keyMove]) => 
      objectsEqual(keyMove, askMove)
    )?.[1] || "";
    return `I didn't hear anything from you. ${askMessage}`;
  }
  
  // Handle single unknown move
  if (moves.length === 1 && moves[0].type === "unknown") {
    return "Sorry, I didn't understand.";
  }
  
  // Default mapping for other moves
  function generateMove(move: Move): string {
    const mapping = nlgMapping.find(([keyMove]) => objectsEqual(keyMove, move));
    if (mapping) return mapping[1];
    return "";
  }

  return moves.map(generateMove).join(" ").trim();
}

// --- NLU Function ---
export function nlu(utterance: string): Move[] {
  console.log("[NLU DEBUG] Processing utterance:", utterance);
  const normalized = utterance.toLowerCase();
  const result = nluMapping[normalized] || [{ type: "unknown" }];
  
  // Minimal change: Add default confidence to maintain compatibility
  const resultWithConfidence = result.map(move => ({
    ...move,
    confidence: 0.9 // Default high confidence to not trigger Task 3 rules unintentionally
  }));
  
  console.log("[NLU DEBUG] Result:", resultWithConfidence);
  return resultWithConfidence;
}