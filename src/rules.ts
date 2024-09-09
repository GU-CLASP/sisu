import {
  Question,
  TotalInformationState,
  InformationState,
  Move,
  DomainRelation,
} from "./types";
import { objectsEqual } from "./utils";

type Rules = {
  [index: string]: (context: TotalInformationState) => (() => InformationState | null);
};

export const rules: Rules = {
  clear_agenda: ({ is }) => {
    return () => ({
      ...is,
      private: { ...is.private, agenda: [] },
    });
  },

  /**
   * Grounding
   */
  get_latest_move: (context) => {
    return () => ({
      ...context.is,
      shared: {
        ...context.is.shared,
        lu: {
          move: context.latest_move!,
          speaker: context.latest_speaker!,
        },
      },
    });
  },

  /**
   * Integrate
   */
  /** rule 5.1 */
  integrate_usr_request: ({ is }) => {
    if (
      is.shared.lu!.speaker === "usr" &&
      is.shared.lu!.move.type === "request"
    ) {
      let action = is.shared.lu!.move.content;
      for (const planInfo of is.domain.plans) {
        if (planInfo.type == "action" && planInfo.content == action) {
          return () => ({
            ...is,
            private: {
              ...is.private,
              agenda: planInfo.plan.concat(is.private.agenda),
            },
          });
        }
      }
    }
  },

  /** rule 2.2 */
  integrate_sys_ask: ({ is }) => {
    if (is.shared.lu!.speaker === "sys" && is.shared.lu!.move.type === "ask") {
      return () => ({
        ...is,
        shared: {
          ...is.shared,
          qud: [is.shared.lu!.move.content as Question, ...is.shared.qud],
        },
      });
    }
  },

  /** rule 2.3 */
  integrate_usr_ask: ({ is }) => {
    if (is.shared.lu!.speaker === "usr" && is.shared.lu!.move.type === "ask") {
      const question = is.shared.lu!.move.content as Question;
      const respondAction = {"type": "respond", "content": question};
      return () => ({
        ...is,
        shared: {
          ...is.shared,
          qud: [question, ...is.shared.qud],
        },
        private: {
          ...is.private,
          agenda: [respondAction, ...is.private.agenda],
        },
      });
    }
  },

  /** rule 2.4 */
  integrate_answer: ({ is }) => {
    const topQUD = is.shared.qud[0];
    const a = is.shared.lu!.move.content;
    if (topQUD && is.shared.lu!.move.type === "answer") {
      if (is.domain.relevant(a, topQUD)) {
        return () => ({
          ...is,
          shared: {
            ...is.shared,
            com: [topQUD(a), ...is.shared.com],
          },
        });
      }
    }
  },

  /** rule 2.6 */
  integrate_greet: (context) => {
    if (context.is.shared.lu!.move.type === "greet") {
      return () => ({
        ...context.is,
      });
    }
  },

  /** TODO rule 2.7 integrate_usr_quit */

  /** TODO rule 2.8 integrate_sys_quit */

  /**
   * DowndateQUD
   */
  /** rule 2.5 */
  downdate_qud: ({ is }) => {
    const q = is.shared.qud[0];
    for (const p of is.shared.com) {
      if (is.domain.resolves(p, q)) {
        return () => ({
          ...is,
          shared: {
            ...is.shared,
            qud: [...is.shared.qud.slice(1)],
          },
        });
      }
    }
  },

  /**
   * ExecPlan
   */
  /** rule 2.9 */
  find_plan: ({ is }) => {
    console.log("testing find_plan");
    if (is.private.agenda.length > 0) {
      const action = is.private.agenda[0];
      if (action.type === "respond") {
        const question = action.content as Question;
        for (const planInfo of is.domain.plans) {
          console.log(`objectsEqual(${planInfo.content.toString()}, ${question.toString()})=${objectsEqual(planInfo.content, question)}`)
          if (planInfo.type == "question" && objectsEqual(planInfo.content, question)) {
            return () => ({
              ...is,
              private: {
                ...is.private,
                agenda: is.private.agenda.slice(1),
                plan: planInfo.plan,
              },
            });
          }
        };
      }
    }
  },

  /** rule 2.10 */
  remove_findout: ({ is }) => {
    if (is.private.plan.length > 0) {
      const action = is.private.plan[0];
      if (action.type === "findout") {
        const question = action.content as Question;
        for (const proposition in is.shared.com) {
          if (is.domain.resolves(proposition, question)) {
            return () => ({
              ...is,
              private: {
                plan: is.private.plan.slice(1),
              }
            });
          }
        }
      }
    }
  },

  /** rule 2.11 */
  exec_consultDB: ({ is }) => {
    if (is.private.plan.length > 0) {
      const action = is.private.plan[0];
      if (action.type === "consultDB") {
        const question = action.content as Question;
        const propositionFromDB = is.database.consultDB();
        return () => ({
          ...is,
          private: {
            plan: [...is.private.plan.slice(1)],
            bel: [...bel, propositionFromDB],
          }
        });
      }
    }
  },

  /**
   * Select
   */
  /** rule 2.12 */
  select_from_plan: ({ is }) => {
    if (is.private.agenda.length === 0 && !!is.private.plan[0]) {
      const action = is.private.plan[0];
      return () => ({
        ...is,
        private: {
          ...is.private,
          agenda: [action, ...is.private.agenda],
        },
      });
    }
  },

  /** rule 2.13 */
  select_ask: ({ is }) => {
    let newIS = is;
    if (
      is.private.agenda[0] &&
      ["findout", "raise"].includes(is.private.agenda[0].type)
    ) {
      const q = is.private.agenda[0].content;
      if (is.private.plan[0] && is.private.plan[0].type === "raise") {
        newIS = {
          ...is,
          next_move: { type: "ask", content: q },
          private: { ...is.private, plan: [...is.private.plan.slice(1)] },
        };
      } else {
        newIS = {
          ...is,
          next_move: { type: "ask", content: q },
        };
      }
      return () => newIS;
    }
  },

  /** rule 2.14 */
  select_respond: ({ is }) => {
    if (
      is.private.agenda.length === 0 &&
      is.private.plan.length === 0 &&
      is.shared.qud[0]
    ) {
      const topQUD = is.shared.qud[0];
      for (const bel of is.private.bel) {
        if (
          !is.shared.com.some(x => objectsEqual(x, bel)) &&
          is.domain.relevant(bel, topQUD)
        ) {
          const respondMove: Move = { type: "respond", content: topQUD };
          return () => ({
            ...is,
            private: {
              ...is.private,
              agenda: [respondMove, ...is.private.agenda],
            },
          });
        }
      }
    }
  },

  select_answer: ({ is }) => {
    if (is.private.agenda[0] && is.private.agenda[0].type === "respond") {
      const question = is.private.agenda[0].content as Question;
      for (const bel of is.private.bel) {
        if (
          !is.shared.com.some(x => objectsEqual(x, bel)) &&
          is.domain.relevant(bel, question)
        ) {
          const answerMove: Move = { type: "answer", content: bel };
          return () => ({ ...is, next_move: answerMove });
        }
      }
    }
  },

  /** only for greet for now */
  select_other: ({ is }) => {
    if (is.private.agenda[0] && is.private.agenda[0].type === "greet") {
      return () => ({ ...is, next_move: is.private.agenda[0] });
    }
  },
};
