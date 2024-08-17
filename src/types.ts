import { SpeechStateExternalEvent } from "speechstate";

export type Question = WhQuestion;
type WhQuestion = (a: string) => string;

export interface Move {
  type: "ask" | "answer" | "respond" | "greet" | "unknown";
  content: null | string | Question;
}

type Speaker = "usr" | "sys";

export interface InformationState {
  private: { agenda: Move[] };
  shared: {
    lu?: { speaker: Speaker; move: Move };
    qud: ((a: string) => string)[];
    com: string[];
  };
}

export interface DMContext {
  ssRef: any;

  /** interface variables */
  next_move: Move | null;
  latest_speaker?: Speaker;
  latest_move?: Move;

  /** information state */
  is: InformationState;
}

export type DMEvent = SpeechStateExternalEvent | SaysMoveEvent;
export type SaysMoveEvent = {
  type: "SAYS";
  value: { speaker: string; move: Move };
};
