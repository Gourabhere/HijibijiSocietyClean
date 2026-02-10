import React, { useState, useRef, useCallback } from 'react';
import { TaskLog, StaffMember, TaskType, BUILDING_STRUCTURE, FLOORS, FLOOR_TASKS, COMMON_TASKS, BlockConfig } from '../types';
import { getTaskIcon } from '../constants';
import { ArrowLeft, Check, Camera, Loader2, ChevronRight, Building2, Layers, X } from 'lucide-react';
import { uploadImageToCloudinary } from '../services/cloudinaryService';
import { stampDateTimeOnImage } from '../services/imageStamp';

interface StaffTaskViewProps {
  currentUser: number;
  logs: TaskLog[];
  onLogTask: (log: Omit<TaskLog, 'id'>) => void;
  staffMembers: StaffMember[];
}

type NavScreen = 'blocks' | 'floors' | 'tasks';

const StaffTaskView: React.FC<StaffTaskViewProps> = ({ currentUser, logs, onLogTask, staffMembers }) => {
  const [screen, setScreen] = useState<NavScreen>('blocks');
  const [selectedBlock, setSelectedBlock] = useState<BlockConfig | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingTaskKey, setUploadingTaskKey] = useState<string | null>(null);
  const [pendingTask, setPendingTask] = useState<{ taskType: TaskType; flat?: string } | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentStaff = staffMembers.find(s => s.id === currentUser);
  const today = new Date().setHours(0, 0, 0, 0);
  const todaysLogs = logs.filter(l => l.timestamp >= today);

  // Check if a specific task is done for block/floor/flat
  const isTaskDone = (block: number, floor: number, taskType: TaskType, flat?: string): boolean => {
    return todaysLogs.some(l =>
      l.block === block &&
      l.floor === floor &&
      l.taskId === taskType &&
      (flat ? l.flat === flat : !l.flat)
    );
  };

  // Count completions for a block today
  const getBlockCompletionCount = (block: number): { done: number; total: number } => {
    const blockConfig = BUILDING_STRUCTURE.find(b => b.block === block);
    if (!blockConfig) return { done: 0, total: 0 };

    let total = 0;
    let done = 0;
    FLOORS.forEach(floor => {
      const flats = blockConfig.flatsPerFloor(floor);
      // Per-flat tasks (garbage)
      const perFlatTasks = FLOOR_TASKS.filter(t => t.perFlat);
      total += perFlatTasks.length * flats.length;
      done += perFlatTasks.reduce((acc, t) =>
        acc + flats.filter(f => isTaskDone(block, floor, t.type, f)).length, 0);
      // Non-flat tasks (brooming, mopping, staircase)
      const nonFlatTasks = FLOOR_TASKS.filter(t => !t.perFlat);
      total += nonFlatTasks.length;
      done += nonFlatTasks.filter(t => isTaskDone(block, floor, t.type)).length;
    });
    return { done, total };
  };

  // Count completions for a floor
  const getFloorCompletionCount = (block: number, floor: number): { done: number; total: number } => {
    const blockConfig = BUILDING_STRUCTURE.find(b => b.block === block);
    if (!blockConfig) return { done: 0, total: 0 };
    const flats = blockConfig.flatsPerFloor(floor);

    let total = 0;
    let done = 0;
    const perFlatTasks = FLOOR_TASKS.filter(t => t.perFlat);
    total += perFlatTasks.length * flats.length;
    done += perFlatTasks.reduce((acc, t) =>
      acc + flats.filter(f => isTaskDone(block, floor, t.type, f)).length, 0);
    const nonFlatTasks = FLOOR_TASKS.filter(t => !t.perFlat);
    total += nonFlatTasks.length;
    done += nonFlatTasks.filter(t => isTaskDone(block, floor, t.type)).length;
    return { done, total };
  };

  // Is common task done?
  const isCommonTaskDone = (taskId: string): boolean => {
    return todaysLogs.some(l => l.taskId === taskId);
  };

  // Handle back navigation
  const handleBack = () => {
    if (screen === 'tasks') { setScreen('floors'); setSelectedFloor(null); }
    else if (screen === 'floors') { setScreen('blocks'); setSelectedBlock(null); }
  };

  // Select a block
  const handleBlockSelect = (blockConfig: BlockConfig) => {
    setSelectedBlock(blockConfig);
    setScreen('floors');
  };

  // Select a floor
  const handleFloorSelect = (floor: number) => {
    setSelectedFloor(floor);
    setScreen('tasks');
  };

  // Complete a task (non-flat or flat-specific)
  const handleCompleteTask = (taskType: TaskType, flat?: string) => {
    if (!selectedBlock || !selectedFloor) return;
    onLogTask({
      taskId: taskType,
      staffId: currentUser,
      timestamp: Date.now(),
      status: 'COMPLETED',
      block: selectedBlock.block,
      floor: selectedFloor,
      flat: flat || undefined,
    });
  };

  // Complete a common task
  const handleCompleteCommonTask = (taskId: string) => {
    onLogTask({
      taskId,
      staffId: currentUser,
      timestamp: Date.now(),
      status: 'COMPLETED',
    });
  };

  // Open camera for a task
  const handlePhotoUpload = async (taskType: TaskType, flat?: string) => {
    setPendingTask({ taskType, flat });
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      // Wait a tick for videoRef to mount
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.error("Camera error:", err);
      alert("Unable to access camera. Please ensure you have granted camera permissions and are using HTTPS or localhost.");
      setCameraOpen(false);
      setPendingTask(null);
    }
  };

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  }, []);

  // Capture photo from live camera feed
  const handleCapturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !pendingTask || !selectedBlock || !selectedFloor) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    // Stop camera immediately
    stopCamera();

    const base64String = canvas.toDataURL('image/jpeg', 0.85);
    const taskKey = `${pendingTask.taskType}-${pendingTask.flat || 'area'}`;
    setUploadingTaskKey(taskKey);
    setUploading(true);

    let imageUrl = base64String;
    try {
      // Stamp date-time on the image before upload
      const stampedImage = await stampDateTimeOnImage(base64String);
      const staffName = currentStaff?.name.replace(/\s+/g, '_') || 'unknown';
      const folder = `societyclean/B${selectedBlock.block}/F${selectedFloor}/${staffName}`;
      const uploadResult = await uploadImageToCloudinary(stampedImage, folder);
      imageUrl = uploadResult.secure_url;
    } catch {
      // fallback to base64
    }

    onLogTask({
      taskId: pendingTask.taskType,
      staffId: currentUser,
      timestamp: Date.now(),
      status: 'COMPLETED',
      imageUrl,
      block: selectedBlock.block,
      floor: selectedFloor,
      flat: pendingTask.flat || undefined,
    });

    setUploading(false);
    setUploadingTaskKey(null);
    setPendingTask(null);
  };

  // ===== RENDER: BLOCK GRID =====
  const renderBlockGrid = () => {
    const overallDone = todaysLogs.length;
    return (
      <div>
        {/* Today's summary */}
        <div className="neu-card animate-in" style={{ marginBottom: 22, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 54, height: 54, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--blue), var(--purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 16, fontWeight: 800, flexShrink: 0,
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)'
          }}>
            {overallDone}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              {currentStaff ? `Hi, ${currentStaff.name}` : 'My Tasks'}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
              {overallDone} tasks completed today
            </div>
          </div>
        </div>

        {/* Block Grid */}
        <div className="section-header animate-in animate-in-delay-1">
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Select Block</span>
          <span className="section-label">6 BLOCKS</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }} className="animate-in animate-in-delay-1">
          {BUILDING_STRUCTURE.map((blockConfig, i) => {
            const { done, total } = getBlockCompletionCount(blockConfig.block);
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <button
                key={blockConfig.block}
                onClick={() => handleBlockSelect(blockConfig)}
                className="neu-card"
                style={{
                  cursor: 'pointer', textAlign: 'center',
                  padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 10, border: 'none', fontFamily: 'inherit',
                  transition: 'all 0.2s ease',
                  animationDelay: `${i * 60}ms`
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: pct === 100
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : `linear-gradient(135deg, ${['#6366f1', '#3b82f6', '#f97316', '#06b6d4', '#8b5cf6', '#ec4899'][i]}, ${['#818cf8', '#60a5fa', '#fb923c', '#22d3ee', '#a78bfa', '#f472b6'][i]})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                  boxShadow: `0 4px 14px ${['rgba(99,102,241,0.3)', 'rgba(59,130,246,0.3)', 'rgba(249,115,22,0.3)', 'rgba(6,182,212,0.3)', 'rgba(139,92,246,0.3)', 'rgba(236,72,153,0.3)'][i]}`
                }}>
                  <Building2 size={24} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Block {blockConfig.block}
                </span>
                <div style={{ fontSize: 11, fontWeight: 600, color: pct === 100 ? 'var(--green)' : 'var(--text-muted)' }}>
                  {done}/{total} done
                </div>
                {/* Mini progress bar */}
                <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'var(--bg-inset)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: pct === 100 ? 'var(--green)' : 'var(--blue)', transition: 'width 0.3s' }} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Common Tasks */}
        <div className="section-header animate-in animate-in-delay-2">
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Common Areas</span>
          <span className="section-label">DAILY</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="animate-in animate-in-delay-2">
          {COMMON_TASKS.map(task => {
            const done = isCommonTaskDone(task.id);
            return (
              <div key={task.id} className="neu-card" style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px'
              }}>
                <span style={{ fontSize: 22 }}>{task.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{task.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>{task.area}</div>
                </div>
                {done ? (
                  <div className="check-circle done"><Check size={14} /></div>
                ) : (
                  <button
                    onClick={() => handleCompleteCommonTask(task.id)}
                    style={{
                      background: 'var(--green)', color: 'white', border: 'none',
                      borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit'
                    }}
                  >
                    Done
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ===== RENDER: FLOOR PICKER =====
  const renderFloorPicker = () => {
    if (!selectedBlock) return null;
    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }} className="animate-in">
          <button onClick={handleBack} className="btn-icon" style={{ flexShrink: 0 }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)' }}>
              {selectedBlock.label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
              Select Floor
            </div>
          </div>
        </div>

        {/* Floor List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FLOORS.map((floor, i) => {
            const { done, total } = getFloorCompletionCount(selectedBlock.block, floor);
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const allDone = done === total && total > 0;
            const flats = selectedBlock.flatsPerFloor(floor);

            return (
              <button
                key={floor}
                onClick={() => handleFloorSelect(floor)}
                className="neu-card animate-in"
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  border: 'none', fontFamily: 'inherit',
                  transition: 'all 0.2s ease',
                  animationDelay: `${i * 40}ms`,
                  opacity: allDone ? 0.7 : 1,
                }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: allDone ? 'var(--green-light)' : 'var(--bg-inset)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: allDone ? 'var(--green)' : 'var(--text-muted)', fontWeight: 800, fontSize: 16
                }}>
                  {floor}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Floor {floor}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
                    {flats.length} flats · {done}/{total} tasks done
                  </div>
                </div>
                {/* Progress */}
                <div style={{ width: 44, textAlign: 'right' }}>
                  {allDone ? (
                    <div className="check-circle done"><Check size={14} /></div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{pct}%</span>
                      <ChevronRight size={16} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ===== RENDER: FLOOR TASKS =====
  const renderFloorTasks = () => {
    if (!selectedBlock || !selectedFloor) return null;
    const flats = selectedBlock.flatsPerFloor(selectedFloor);

    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }} className="animate-in">
          <button onClick={handleBack} className="btn-icon" style={{ flexShrink: 0 }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)' }}>
              {selectedBlock.label} · Floor {selectedFloor}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
              Floor Tasks
            </div>
          </div>
        </div>

        {/* Per-flat tasks (Garbage Collection) */}
        {FLOOR_TASKS.filter(t => t.perFlat).map(taskDef => (
          <div key={taskDef.type} className="animate-in animate-in-delay-1" style={{ marginBottom: 22 }}>
            <div className="section-header">
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                {taskDef.icon} {taskDef.label}
              </span>
              <span className="section-label">{flats.length} FLATS</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(flats.length, 4)}, 1fr)`, gap: 10 }}>
              {flats.map(flat => {
                const done = isTaskDone(selectedBlock.block, selectedFloor, taskDef.type, flat);
                const thisKey = `${taskDef.type}-${flat}`;
                const isThisUploading = uploadingTaskKey === thisKey;

                return (
                  <button
                    key={flat}
                    onClick={() => {
                      if (!done && !isThisUploading) {
                        handlePhotoUpload(taskDef.type, flat);
                      }
                    }}
                    disabled={done || isThisUploading}
                    className={done ? 'neu-card' : 'neu-card-inset'}
                    style={{
                      padding: '14px 8px', border: 'none', fontFamily: 'inherit',
                      cursor: done ? 'default' : 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      opacity: done ? 0.7 : 1, transition: 'all 0.2s',
                      background: done ? 'var(--green-light)' : undefined,
                    }}
                  >
                    {isThisUploading ? (
                      <Loader2 size={20} className="spin" style={{ color: 'var(--blue)' }} />
                    ) : done ? (
                      <Check size={20} style={{ color: 'var(--green)' }} />
                    ) : (
                      <Camera size={18} style={{ color: 'var(--text-muted)' }} />
                    )}
                    <span style={{ fontSize: 13, fontWeight: 700, color: done ? 'var(--green)' : 'var(--text-primary)' }}>
                      {flat}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>
                      {done ? 'Done' : 'Tap'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Non-flat tasks (Brooming, Mopping, Staircase) */}
        <div className="animate-in animate-in-delay-2" style={{ marginBottom: 22 }}>
          <div className="section-header">
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Area Tasks</span>
            <span className="section-label">LOBBY & STAIRCASE</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FLOOR_TASKS.filter(t => !t.perFlat).map(taskDef => {
              const done = isTaskDone(selectedBlock.block, selectedFloor, taskDef.type);
              const thisKey = `${taskDef.type}-area`;
              const isThisUploading = uploadingTaskKey === thisKey;

              return (
                <div key={taskDef.type} className="neu-card" style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px'
                }}>
                  <span style={{ fontSize: 22 }}>{taskDef.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{taskDef.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
                      {selectedBlock.label} · Floor {selectedFloor}
                    </div>
                  </div>
                  {done ? (
                    <div className="check-circle done"><Check size={14} /></div>
                  ) : isThisUploading ? (
                    <Loader2 size={20} className="spin" style={{ color: 'var(--blue)' }} />
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handlePhotoUpload(taskDef.type)}
                        style={{
                          background: 'var(--blue-light)', color: 'var(--blue)', border: 'none',
                          borderRadius: 10, padding: '8px 10px', cursor: 'pointer', fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', gap: 4
                        }}
                      >
                        <Camera size={14} />
                      </button>
                      <button
                        onClick={() => handleCompleteTask(taskDef.type)}
                        style={{
                          background: 'var(--green)', color: 'white', border: 'none',
                          borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', fontFamily: 'inherit'
                        }}
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>


      </div>
    );
  };

  // ===== CAMERA MODAL =====
  const renderCameraModal = () => {
    if (!cameraOpen) return null;
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#000', display: 'flex', flexDirection: 'column',
      }}>
        {/* Camera feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ flex: 1, width: '100%', objectFit: 'cover' }}
        />
        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Controls overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '24px 0 40px', display: 'flex', justifyContent: 'center', alignItems: 'center',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
        }}>
          {/* Close button */}
          <button
            onClick={() => { stopCamera(); setPendingTask(null); }}
            style={{
              position: 'absolute', left: 24, top: 24,
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
              width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', backdropFilter: 'blur(8px)',
            }}
          >
            <X size={22} style={{ color: 'white' }} />
          </button>

          {/* Shutter button */}
          <button
            onClick={handleCapturePhoto}
            style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'white', border: '4px solid rgba(255,255,255,0.4)',
              cursor: 'pointer', boxShadow: '0 0 20px rgba(255,255,255,0.3)',
              transition: 'transform 0.1s',
            }}
            onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.9)')}
            onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          />
        </div>

        {/* Task label */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '48px 20px 16px',
          background: 'linear-gradient(rgba(0,0,0,0.7), transparent)',
          textAlign: 'center',
        }}>
          <div style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>
            📸 {pendingTask?.flat ? `Flat ${pendingTask.flat}` : 'Area'} — {pendingTask?.taskType}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 }}>
            Take a live photo as proof of work
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: 16 }}>
      {screen === 'blocks' && renderBlockGrid()}
      {screen === 'floors' && renderFloorPicker()}
      {screen === 'tasks' && renderFloorTasks()}
      {renderCameraModal()}
    </div>
  );
};

export default StaffTaskView;
