'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { Rule, Recipe, FeedExplanation } from '../shared';

// State interface
interface FeedLabState {
  rules: Rule[];
  selectedRuleId: string | null;
  editingRuleId: string | null;
  activeExplanation: FeedExplanation | null;
}

// Action types
type FeedLabAction =
  | { type: 'SET_RULES'; payload: Rule[] }
  | { type: 'ADD_RULE'; payload: Rule }
  | { type: 'UPDATE_RULE'; payload: { id: string; updates: Partial<Rule> } }
  | { type: 'DELETE_RULE'; payload: string }
  | { type: 'TOGGLE_RULE'; payload: { id: string; enabled: boolean } }
  | { type: 'REORDER_RULES'; payload: Rule[] }
  | { type: 'SELECT_RULE'; payload: string | null }
  | { type: 'SET_EDITING'; payload: string | null }
  | { type: 'SET_EXPLANATION'; payload: FeedExplanation | null }
  | { type: 'APPLY_RECIPE'; payload: Recipe };

// Initial state
const initialState: FeedLabState = {
  rules: [],
  selectedRuleId: null,
  editingRuleId: null,
  activeExplanation: null,
};

// Reducer
function feedLabReducer(state: FeedLabState, action: FeedLabAction): FeedLabState {
  switch (action.type) {
    case 'SET_RULES':
      return { ...state, rules: action.payload };

    case 'ADD_RULE':
      return { ...state, rules: [...state.rules, action.payload] };

    case 'UPDATE_RULE':
      return {
        ...state,
        rules: state.rules.map((rule) =>
          rule.id === action.payload.id
            ? { ...rule, ...action.payload.updates }
            : rule
        ),
      };

    case 'DELETE_RULE':
      return {
        ...state,
        rules: state.rules.filter((rule) => rule.id !== action.payload),
        selectedRuleId:
          state.selectedRuleId === action.payload ? null : state.selectedRuleId,
        editingRuleId:
          state.editingRuleId === action.payload ? null : state.editingRuleId,
      };

    case 'TOGGLE_RULE':
      return {
        ...state,
        rules: state.rules.map((rule) =>
          rule.id === action.payload.id
            ? { ...rule, enabled: action.payload.enabled }
            : rule
        ),
      };

    case 'REORDER_RULES':
      return { ...state, rules: action.payload };

    case 'SELECT_RULE':
      return { ...state, selectedRuleId: action.payload };

    case 'SET_EDITING':
      return { ...state, editingRuleId: action.payload };

    case 'SET_EXPLANATION':
      return { ...state, activeExplanation: action.payload };

    case 'APPLY_RECIPE': {
      const newRule: Rule = {
        id: `rule-${Date.now()}`,
        name: action.payload.name,
        type: action.payload.type,
        weight: action.payload.weight,
        conditions: action.payload.conditions,
        enabled: true,
      };
      return { ...state, rules: [...state.rules, newRule] };
    }

    default:
      return state;
  }
}

// Context value interface
interface FeedLabContextValue {
  state: FeedLabState;
  // Rule actions
  setRules: (rules: Rule[]) => void;
  addRule: (rule: Rule) => void;
  updateRule: (id: string, updates: Partial<Rule>) => void;
  deleteRule: (id: string) => void;
  toggleRule: (id: string, enabled: boolean) => void;
  reorderRules: (rules: Rule[]) => void;
  // Selection actions
  selectRule: (id: string | null) => void;
  setEditing: (id: string | null) => void;
  setExplanation: (explanation: FeedExplanation | null) => void;
  // Recipe actions
  applyRecipe: (recipe: Recipe) => void;
}

const FeedLabContext = createContext<FeedLabContextValue | null>(null);

// Provider component
interface FeedLabProviderProps {
  children: ReactNode;
  initialRules?: Rule[];
}

export function FeedLabProvider({ children, initialRules = [] }: FeedLabProviderProps) {
  const [state, dispatch] = useReducer(feedLabReducer, {
    ...initialState,
    rules: initialRules,
  });

  // Memoized action creators
  const setRules = useCallback((rules: Rule[]) => {
    dispatch({ type: 'SET_RULES', payload: rules });
  }, []);

  const addRule = useCallback((rule: Rule) => {
    dispatch({ type: 'ADD_RULE', payload: rule });
  }, []);

  const updateRule = useCallback((id: string, updates: Partial<Rule>) => {
    dispatch({ type: 'UPDATE_RULE', payload: { id, updates } });
  }, []);

  const deleteRule = useCallback((id: string) => {
    dispatch({ type: 'DELETE_RULE', payload: id });
  }, []);

  const toggleRule = useCallback((id: string, enabled: boolean) => {
    dispatch({ type: 'TOGGLE_RULE', payload: { id, enabled } });
  }, []);

  const reorderRules = useCallback((rules: Rule[]) => {
    dispatch({ type: 'REORDER_RULES', payload: rules });
  }, []);

  const selectRule = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_RULE', payload: id });
  }, []);

  const setEditing = useCallback((id: string | null) => {
    dispatch({ type: 'SET_EDITING', payload: id });
  }, []);

  const setExplanation = useCallback((explanation: FeedExplanation | null) => {
    dispatch({ type: 'SET_EXPLANATION', payload: explanation });
  }, []);

  const applyRecipe = useCallback((recipe: Recipe) => {
    dispatch({ type: 'APPLY_RECIPE', payload: recipe });
  }, []);

  const value = useMemo<FeedLabContextValue>(
    () => ({
      state,
      setRules,
      addRule,
      updateRule,
      deleteRule,
      toggleRule,
      reorderRules,
      selectRule,
      setEditing,
      setExplanation,
      applyRecipe,
    }),
    [
      state,
      setRules,
      addRule,
      updateRule,
      deleteRule,
      toggleRule,
      reorderRules,
      selectRule,
      setEditing,
      setExplanation,
      applyRecipe,
    ]
  );

  return (
    <FeedLabContext.Provider value={value}>{children}</FeedLabContext.Provider>
  );
}

// Main hook
export function useFeedLab() {
  const context = useContext(FeedLabContext);
  if (!context) {
    throw new Error('useFeedLab must be used within a FeedLabProvider');
  }
  return context;
}

// Selective hooks for performance optimization
export function useFeedLabRules() {
  const { state, setRules, addRule, updateRule, deleteRule, toggleRule, reorderRules } =
    useFeedLab();
  return useMemo(
    () => ({
      rules: state.rules,
      setRules,
      addRule,
      updateRule,
      deleteRule,
      toggleRule,
      reorderRules,
    }),
    [state.rules, setRules, addRule, updateRule, deleteRule, toggleRule, reorderRules]
  );
}

export function useFeedLabEditing() {
  const { state, setEditing } = useFeedLab();
  return useMemo(
    () => ({
      editingRuleId: state.editingRuleId,
      setEditing,
    }),
    [state.editingRuleId, setEditing]
  );
}

export function useFeedLabSelection() {
  const { state, selectRule, setExplanation } = useFeedLab();
  return useMemo(
    () => ({
      selectedRuleId: state.selectedRuleId,
      activeExplanation: state.activeExplanation,
      selectRule,
      setExplanation,
    }),
    [state.selectedRuleId, state.activeExplanation, selectRule, setExplanation]
  );
}
