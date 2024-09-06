import InformationState from "./types";

export const initialIS = (): InformationState => ({
  domain: [
    {
      type: "resolves",
      content: ["pizza", (x) => ({"predicate": "favorite_food", "argument": x})],
    },
    {
      type: "resolves",
      content: [
        {"predicate": "favorite_food", "argument": "pizza"},
        (x) => ({"predicate": "favorite_food", "argument": x})
      ],
    },
  ],
  next_move: null,
  private: {
    plan: [],
    agenda: [
      {
        type: "greet",
        content: null,
      },
    ],
    bel: [{"predicate": "favorite_food", "argument": "pizza"}],
  },
  shared: { lu: undefined, qud: [], com: [] },
});
