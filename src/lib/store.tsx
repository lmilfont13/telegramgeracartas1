'use client';
// ============================================================
// Application State Store (React Context)
// ============================================================
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type { PatientData, ClinicalData, AssessmentResult, AuditEntry } from './types';

interface AppState {
    user: { email: string; name: string; role: 'admin' | 'clinician' } | null;
    currentAssessment: {
        patient: PatientData | null;
        clinical: ClinicalData | null;
        result: AssessmentResult | null;
    };
    assessmentHistory: AssessmentResult[];
    language: 'pt-BR' | 'en-US';
}

type Action =
    | { type: 'LOGIN'; payload: { email: string; name: string; role: 'admin' | 'clinician' } }
    | { type: 'LOGOUT' }
    | { type: 'SET_PATIENT'; payload: PatientData }
    | { type: 'SET_CLINICAL'; payload: ClinicalData }
    | { type: 'SET_RESULT'; payload: AssessmentResult }
    | { type: 'CLEAR_ASSESSMENT' }
    | { type: 'ADD_TO_HISTORY'; payload: AssessmentResult }
    | { type: 'SET_LANGUAGE'; payload: 'pt-BR' | 'en-US' };

const initialState: AppState = {
    user: null,
    currentAssessment: { patient: null, clinical: null, result: null },
    assessmentHistory: [],
    language: 'pt-BR',
};

function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case 'LOGIN':
            return { ...state, user: action.payload };
        case 'LOGOUT':
            return { ...initialState };
        case 'SET_PATIENT':
            return { ...state, currentAssessment: { ...state.currentAssessment, patient: action.payload } };
        case 'SET_CLINICAL':
            return { ...state, currentAssessment: { ...state.currentAssessment, clinical: action.payload } };
        case 'SET_RESULT':
            return { ...state, currentAssessment: { ...state.currentAssessment, result: action.payload } };
        case 'CLEAR_ASSESSMENT':
            return { ...state, currentAssessment: { patient: null, clinical: null, result: null } };
        case 'ADD_TO_HISTORY':
            return { ...state, assessmentHistory: [action.payload, ...state.assessmentHistory] };
        case 'SET_LANGUAGE':
            return { ...state, language: action.payload };
        default:
            return state;
    }
}

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState);
    return (
        <AppContext.Provider value= {{ state, dispatch }
}>
    { children }
    </AppContext.Provider>
  );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within AppProvider');
    return context;
}
