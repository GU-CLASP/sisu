import { SpeechStateExternalEvent } from "speechstate";

export type WhQuestion = (a: string) => string;
export interface Move {
  type: "ask" | "answer" | "respond" | "greet" | "unknown";
  content: null | string | WhQuestion;
}

type Speaker = "usr" | "sys";

export interface DMContext {
  ssRef?: any;
  next_move: Move | null;
  latest_speaker?: Speaker;
  latest_move?: Move;

  is: {
    private: { agenda: Move[] };
    shared: {
      lu?: { speaker: Speaker; move: Move };
      qud: ((a: string) => string)[];
      com: string[];
    };
  };
}

export type DMEvent = SpeechStateExternalEvent | SaysMoveEvent | UpdateEvent;

export type UpdateEvent = {
  type: "UPDATE";
  value: string;
};
export type SaysMoveEvent = {
  type: "SAYS";
  value: { speaker: string; move: Move };
};
