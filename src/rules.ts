import {
  Question,
  TotalInformationState,
  InformationState,
  Move,
  DomainRelation,
} from "./types";
import { objectsEqual } from "./utils";

type Rules = {
  [index: string]: (context: TotalInformationState) => {
    preconditions: boolean;
    result: InformationState;
  };
};

export const rules: Rules = {
  clear_agenda: ({ is }) => {
    const newIS = {
      ...is,
      private: { ...is.private, agenda: [] },
    };
    console.debug(`[ISU clear_agenda]`, newIS);
    return {
      preconditions: true,
      result: newIS,
    };
  },

  /**
   * Grounding
   */
  get_latest_move: (context) => {
    const newIS = {
      ...context.is,
      shared: {
        ...context.is.shared,
        lu: {
          move: context.latest_move!,
          speaker: context.latest_speaker!,
        },
      },
    };
    console.debug(`[ISU get_latest_move]`, newIS);
    return {
      preconditions: true,
      result: newIS,
    };
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
          const newIS = {
            ...is,
            private: {
              ...is.private,
              agenda: planInfo.plan.concat(is.private.agenda),
            },
          };
          console.debug(`[ISU integrate_usr_request]`, newIS);
          return {
            preconditions: true,
            result: newIS,
          };
        }
      }
    }
    return {
      preconditions: false,
      result: is,
    };
  },

  /** rule 2.2 */
  integrate_sys_ask: ({ is }) => {
    if (is.shared.lu!.speaker === "sys" && is.shared.lu!.move.type === "ask") {
      const newIS = {
        ...is,
        shared: {
          ...is.shared,
          qud: [is.shared.lu!.move.content as Question, ...is.shared.qud],
        },
      };
      console.debug(`[ISU integrate_sys_ask]`, newIS);
      return {
        preconditions: true,
        result: newIS,
      };
    }
    return {
      preconditions: false,
      result: is,
    };
  },

  /** rule 2.3 */
  integrate_usr_ask: ({ is }) => {
    if (is.shared.lu!.speaker === "usr" && is.shared.lu!.move.type === "ask") {
      const question = is.shared.lu!.move.content as Question;
      const respondAction = {"type": "respond", "content": question};
      const newIS = {
        ...is,
        shared: {
          ...is.shared,
          qud: [question, ...is.shared.qud],
        },
        private: {
          ...is.private,
          agenda: [respondAction, ...is.private.agenda],
        },
      };
      console.debug(`[ISU integrate_usr_ask]`, newIS);
      return {
        preconditions: true,
        result: newIS,
      };
    }
    return {
      preconditions: false,
      result: is,
    };
  },

  /** rule 2.4 */
  integrate_answer: ({ is }) => {
    const topQUD = is.shared.qud[0];
    const a = is.shared.lu!.move.content as string;
    if (topQUD && is.shared.lu!.move.type === "answer") {
      if (is.domain.relevant(a, topQUD)) {
        // TODO (?) should combined proposition be added to domain?
        const newIS = {
          ...is,
          shared: {
            ...is.shared,
            com: [topQUD(a), ...is.shared.com],
          },
        };
        console.debug(`[ISU integrate_usr_ask]`, newIS);
        return {
          preconditions: true,
          result: newIS,
        };
      }
    }
    return {
      preconditions: false,
      result: is,
    };
  },

  /** rule 2.6 */
  integrate_greet: (context) => {
    if (context.is.shared.lu!.move.type === "greet") {
      const newIS = {
        ...context.is,
      };
      console.debug(`[ISU integrate_greet]`, newIS);
      return {
        preconditions: true,
        result: newIS,
      };
    }
    return {
      preconditions: false,
      result: context.is,
    };
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
        const newIS = {
          ...is,
          shared: {
            ...is.shared,
            qud: [...is.shared.qud.slice(1)],
          },
        };
        console.debug(`[ISU downdate_qud]`, newIS);
        return {
          preconditions: false,
          result: newIS,
        };
      }
    }
    return {
      preconditions: false,
      result: is,
    };
  },

  /**
   * ExecPlan
   */
  /** rule 2.9 */
  find_plan: ({ is }) => {
    if (is.private.agenda.length > 0) {
      const action = is.private.agenda[0];
      if (action.type === "respond") {
        const question = action.content as Question;
        for (const planInfo of is.domain.plans) {
          if (planInfo.type == "question" && objectsEqual(planInfo.content, question)) {
            const newIS = {
              ...is,
              private: {
                ...is.private,
                agenda: is.private.agenda.slice(1),
                plan: planInfo.plan,
              },
            };
            console.debug(`[ISU find_plan]`, newIS);
            return {
              preconditions: true,
              result: newIS,
            };
          }
        };
      }
    }
    return {
      preconditions: false,
      result: is,
    };
  },

  /** TODO rule 2.10 remove_findout */

  /** rule 2.10 */
  exec_consultDB: ({ is }) => {
    if (is.private.plan.length > 0) {
      const action = is.private.plan[0];
      if (action.type === "consultDB") {
        const question = action.content as Question;
        const propositionFromDB = is.database.consultDB();
        const newIS = {
          ...is,
          private: {
            plan: [...is.private.plan.slice(1)],
            bel: [...bel, propositionFromDB],
          }
        };
        console.debug(`[ISU exec_consultDB]`, newIS);
        return {
          preconditions: true,
          result: newIS,
        };
      }
    }
    return {
      preconditions: false,
      result: is,
    };
  },

  /**
   * Select
   */
  /** rule 2.12 */
  select_from_plan: ({ is }) => {
    if (is.private.agenda.length === 0 && !!is.private.plan[0]) {
      const action = is.private.plan[0];
      const newIS = {
        ...is,
        private: {
          ...is.private,
          agenda: [action, ...is.private.agenda],
        },
      };
      console.debug(`[ISU select_from_plan]`, newIS);
      return {
        preconditions: true,
        result: newIS,
      };
    }
    return {
      preconditions: false,
      result: is,
    };
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
        console.debug(`[ISU select_ask]`, newIS);
      } else {
        newIS = {
          ...is,
          next_move: { type: "ask", content: q },
        };
        console.debug(`[ISU select_ask]`, newIS);
      }
      return {
        preconditions: true,
        result: newIS,
      };
    }
    return {
      preconditions: false,
      result: is,
    };
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
          const newIS = {
            ...is,
            private: {
              ...is.private,
              agenda: [respondMove, ...is.private.agenda],
            },
          };
          console.debug(`[ISU select_respond]`, newIS);
          return {
            preconditions: true,
            result: newIS,
          };
        }
      }
    }
    return {
      preconditions: false,
      result: is,
    };
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
          const newIS = { ...is, next_move: answerMove };
          console.debug(`[ISU select_answer]`, newIS);
          return {
            preconditions: true,
            result: newIS,
          };
        }
      }
    }
    return {
      preconditions: false,
      result: is,
    };
  },

  /** only for greet for now */
  select_other: ({ is }) => {
    if (is.private.agenda[0] && is.private.agenda[0].type === "greet") {
      const newIS = { ...is, next_move: is.private.agenda[0] };
      console.debug(`[ISU select_answer]`, newIS);
      return {
        preconditions: true,
        result: newIS,
      };
    }
    return {
      preconditions: false,
      result: is,
    };
  },
};
