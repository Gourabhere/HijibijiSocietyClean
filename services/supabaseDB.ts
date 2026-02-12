import { supabase } from './supabaseClient';
import { TaskLog, PunchLog, SupplyRequest, StaffMember } from '../types';

// ===== STAFF MEMBERS =====

export async function fetchStaffMembers(): Promise<StaffMember[]> {
    const { data, error } = await supabase
        .from('staff_members')
        .select('*')
        .order('id');
    if (error) throw error;
    return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        role: row.role as 'Housekeeper',
        avatar: row.avatar || '',
        blockAssignment: row.block_assignment || '',
    }));
}

export async function verifyStaffPin(staffId: number, pin: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('staff_members')
        .select('pin')
        .eq('id', staffId)
        .single();
    if (error || !data) return false;
    return data.pin === pin;
}

export async function insertStaffMember(staff: Omit<StaffMember, 'id'>): Promise<StaffMember> {
    const { data, error } = await supabase
        .from('staff_members')
        .insert({
            name: staff.name,
            role: staff.role,
            avatar: staff.avatar,
            block_assignment: staff.blockAssignment,
        })
        .select()
        .single();
    if (error) throw error;
    return {
        id: data.id,
        name: data.name,
        role: data.role as 'Housekeeper',
        avatar: data.avatar || '',
        blockAssignment: data.block_assignment || '',
    };
}

// ===== TASK LOGS =====

export async function fetchTaskLogs(): Promise<TaskLog[]> {
    const { data, error } = await supabase
        .from('task_logs')
        .select('*')
        .order('timestamp', { ascending: false });
    if (error) throw error;
    return (data || []).map(row => ({
        id: row.id,
        taskId: row.task_id,
        staffId: row.staff_id,
        timestamp: row.timestamp,
        status: row.status,
        imageUrl: row.image_url || undefined,
        aiFeedback: row.ai_feedback || undefined,
        aiRating: row.ai_rating || undefined,
        block: row.block || undefined,
        floor: row.floor || undefined,
        flat: row.flat || undefined,
    }));
}

export async function insertTaskLog(log: Omit<TaskLog, 'id'>): Promise<TaskLog> {
    const { data, error } = await supabase
        .from('task_logs')
        .insert({
            task_id: log.taskId,
            staff_id: log.staffId,
            timestamp: log.timestamp,
            status: log.status,
            image_url: log.imageUrl || null,
            ai_feedback: log.aiFeedback || null,
            ai_rating: log.aiRating || null,
            block: log.block || null,
            floor: log.floor || null,
            flat: log.flat || null,
        })
        .select()
        .single();
    if (error) throw error;
    return {
        id: data.id,
        taskId: data.task_id,
        staffId: data.staff_id,
        timestamp: data.timestamp,
        status: data.status,
        imageUrl: data.image_url || undefined,
        aiFeedback: data.ai_feedback || undefined,
        aiRating: data.ai_rating || undefined,
        block: data.block || undefined,
        floor: data.floor || undefined,
        flat: data.flat || undefined,
    };
}

// ===== PUNCH LOGS =====

export async function fetchPunchLogs(): Promise<PunchLog[]> {
    const { data, error } = await supabase
        .from('punch_logs')
        .select('*')
        .order('timestamp', { ascending: false });
    if (error) throw error;
    return (data || []).map(row => ({
        id: row.id,
        staffId: row.staff_id,
        type: row.type as 'IN' | 'OUT',
        timestamp: row.timestamp,
    }));
}

export async function insertPunchLog(log: Omit<PunchLog, 'id'>): Promise<PunchLog> {
    const { data, error } = await supabase
        .from('punch_logs')
        .insert({
            staff_id: log.staffId,
            type: log.type,
            timestamp: log.timestamp,
        })
        .select()
        .single();
    if (error) throw error;
    return {
        id: data.id,
        staffId: data.staff_id,
        type: data.type as 'IN' | 'OUT',
        timestamp: data.timestamp,
    };
}

// ===== SUPPLY REQUESTS =====

export async function fetchSupplyRequests(): Promise<SupplyRequest[]> {
    const { data, error } = await supabase
        .from('supply_requests')
        .select('*')
        .order('timestamp', { ascending: false });
    if (error) throw error;
    return (data || []).map(row => ({
        id: row.id,
        item: row.item,
        quantity: row.quantity,
        urgency: row.urgency as 'LOW' | 'MEDIUM' | 'HIGH',
        status: row.status as 'OPEN' | 'FULFILLED' | 'REJECTED',
        requesterId: row.requester_id,
        timestamp: row.timestamp,
    }));
}

export async function insertSupplyRequest(req: Omit<SupplyRequest, 'id'>): Promise<SupplyRequest> {
    const { data, error } = await supabase
        .from('supply_requests')
        .insert({
            item: req.item,
            quantity: req.quantity,
            urgency: req.urgency,
            status: req.status,
            requester_id: req.requesterId,
            timestamp: req.timestamp,
        })
        .select()
        .single();
    if (error) throw error;
    return {
        id: data.id,
        item: data.item,
        quantity: data.quantity,
        urgency: data.urgency as 'LOW' | 'MEDIUM' | 'HIGH',
        status: data.status as 'OPEN' | 'FULFILLED' | 'REJECTED',
        requesterId: data.requester_id,
        timestamp: data.timestamp,
    };
}

export async function updateSupplyStatus(id: string, status: 'OPEN' | 'FULFILLED' | 'REJECTED'): Promise<void> {
    const { error } = await supabase
        .from('supply_requests')
        .update({ status })
        .eq('id', id);
    if (error) throw error;
}
