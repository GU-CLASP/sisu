import { SpeechStateExternalEvent } from "speechstate";

type Individuals = Predicates;
type Predicates = { [index: string]: string };
export type Domain = {
  plans: PlanInfo[];
  predicates: Predicates; // Mapping from predicate to sort
  individuals: Individuals; // Mapping from individual to sort
};

export type PlanInfo = {
  type: "action" | "issue";
  content: null | Proposition | ShortAnswer | Question;
  plan: Action[];
};

export type Database = {
  consultDB: (q: Question, p: Proposition[]) => Proposition | null;
};

export type ShortAnswer = string;
export type Proposition = {
  predicate: string;
  argument: string;
};

export type Question = WhQuestion;
type WhQuestion = { type: "whq"; predicate: string };

// Base interface with confidence field for all moves
interface BaseMove {
  type: string;
  content: any;
  confidence?: number; // Added for Task 3: Confidence-based grounding
}

interface OtherMove extends BaseMove {
  type: "greet" | "request";
  content: null | string;
}

interface AnswerMove extends BaseMove {
  type: "answer";
  content: Proposition | ShortAnswer;
}

interface AskMove extends BaseMove {
  type: "ask";
  content: Question;
}

interface InformMove extends BaseMove {
  type: "inform";
  content: string;
}

interface AcknowledgeMove extends BaseMove {
  type: "acknowledge"; 
  content: string;
}

interface NoInputMove extends BaseMove {
  type: "no_input";
  content: null;
}

export type Move = OtherMove | AnswerMove | AskMove | NoInputMove | InformMove | AcknowledgeMove;

export type Action = {
  type:
    | "greet"
    | "respond" // not to be used in plans
    | "raise"
    | "findout"
    | "consultDB";
  content: null | Question;
}

type Speaker = "usr" | "sys";

export interface InformationState {
  next_moves: Move[];
  domain: Domain;
  database: Database;
  private: { 
    agenda: Action[]; 
    plan: Action[]; 
    bel: Proposition[]; 
    last_no_input?: boolean; 
    no_input_count?: number;
    no_input_processed?: boolean; // Added for Task 2c: Prevent multiple rule applications
  };
  shared: {
    lu?: { speaker: Speaker; moves: Move[] };
    qud: Question[];
    com: Proposition[];
  };
}

export interface DMContext extends TotalInformationState {
  ssRef: any;
  lastUserMoves?: Move[];
}

export interface DMEContext extends TotalInformationState {
  parentRef: any;
}

export interface TotalInformationState {
  /** interface variables */
  latest_speaker?: Speaker;
  latest_moves?: Move[];

  /** information state */
  is: InformationState;
}

export type DMEvent =
  | { type: "CLICK" }
  | SpeechStateExternalEvent
  | NextMovesEvent;

export type DMEEvent = SaysMovesEvent;

export type SaysMovesEvent = {
  type: "SAYS";
  value: { speaker: Speaker; moves: Move[] };
};

export type NextMovesEvent = {
  type: "NEXT_MOVES";
  value: Move[];
};