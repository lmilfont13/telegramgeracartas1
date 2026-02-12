// ============================================================
// Audit Logger (In-Memory for MVP)
// ============================================================
import type { AuditEntry } from './types';
import { v4 as uuidv4 } from 'uuid';

// In-memory audit log (will be stored in DB in V1)
const auditLog: AuditEntry[] = [];

export function logAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
    const auditEntry: AuditEntry = {
        ...entry,
        id: uuidv4(),
        timestamp: new Date().toISOString(),
    };
    auditLog.push(auditEntry);
    console.log('[AUDIT]', JSON.stringify(auditEntry));
    return auditEntry;
}

export function getAuditLog(): AuditEntry[] {
    return [...auditLog];
}

export function getAuditLogForEntity(entityType: string, entityId: string): AuditEntry[] {
    return auditLog.filter(e => e.entityType === entityType && e.entityId === entityId);
}

export function clearAuditLog(): void {
    auditLog.length = 0;
}
