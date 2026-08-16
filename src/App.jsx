import { useState, useMemo, useRef, useEffect } from "react";
import { HardHat, Wrench, Link2, Plus, X, ChevronLeft, ChevronRight, AlertTriangle, Users, Pin, CornerDownRight, Truck, User, UserCog, Copy, Printer, Ban } from "lucide-react";

const TYPE_COLORS = {
  crew: { fill: "#3B82F6", text: "#0B2A57" },
  equipment: { fill: "#EAB308", text: "#3F2E02" },
  dumptruck: { fill: "#14B8A6", text: "#08312C" },
  attachment: { fill: "#8B5CF6", text: "#2A1E5C" },
  driver: { fill: "#EC4899", text: "#4B1330" },
  operator: { fill: "#06B6D4", text: "#052E36" },
};
const TYPE_SCALE = {
  crew: { font: 13, denseFont: 12, icon: 15, pad: "7px 10px", densePad: "5px 8px" },
  equipment: { font: 12, denseFont: 11, icon: 13, pad: "7px 9px", densePad: "4px 7px" },
  dumptruck: { font: 12, denseFont: 11, icon: 13, pad: "7px 9px", densePad: "4px 7px" },
  attachment: { font: 10.5, denseFont: 10, icon: 11, pad: "6px 8px", densePad: "3px 6px" },
  driver: { font: 10.5, denseFont: 10, icon: 11, pad: "6px 8px", densePad: "3px 6px" },
  operator: { font: 10.5, denseFont: 10, icon: 11, pad: "6px 8px", densePad: "3px 6px" },
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TYPE_LABELS = { crew: "Crew", equipment: "Excavator", dumptruck: "Dump Truck", attachment: "Attachment", driver: "Driver", operator: "Operator" };
const EQUIPMENT_TIER_TYPES = ["equipment", "dumptruck"];
const LEVEL2_TYPES = ["attachment", "driver", "operator"];

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatShort(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

let idCounter = 1000;
function nextId() {
  idCounter += 1;
  return idCounter;
}

const STORAGE_KEY = "crew-scheduler-data-v1";

function loadPersisted() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.resources || !parsed.jobs || !parsed.assignments) return null;
    return parsed;
  } catch {
    return null;
  }
}

function bumpIdCounterPast(persisted) {
  if (!persisted) return;
  let maxId = idCounter;
  [persisted.resources, persisted.jobs, persisted.assignments].forEach((arr) => {
    arr.forEach((item) => {
      if (typeof item.id === "number" && item.id > maxId) maxId = item.id;
    });
  });
  idCounter = maxId;
}

function removeWithDescendants(prevAssignments, rootIds) {
  const removeSet = new Set(rootIds);
  let changed = true;
  while (changed) {
    changed = false;
    prevAssignments.forEach((a) => {
      if (a.parentAssignmentId != null && removeSet.has(a.parentAssignmentId) && !removeSet.has(a.id)) {
        removeSet.add(a.id);
        changed = true;
      }
    });
  }
  return prevAssignments.filter((a) => !removeSet.has(a.id));
}

export default function CrewScheduler() {
  const persisted = useRef(loadPersisted()).current;
  if (persisted) bumpIdCounterPast(persisted);

  const [resources, setResources] = useState(
    () =>
      persisted?.resources || [
        { id: 1, name: "Framing Crew A", type: "crew" },
        { id: 2, name: "Excavation Crew", type: "crew" },
        { id: 3, name: "Finish Crew B", type: "crew" },
        { id: 4, name: "CAT 315", type: "equipment" },
        { id: 5, name: "Tandem Dump #1", type: "dumptruck" },
        { id: 6, name: "Tandem Dump #2", type: "dumptruck" },
        { id: 7, name: "24\" Trenching Bucket", type: "attachment" },
        { id: 8, name: "Hydraulic Thumb", type: "attachment" },
        { id: 9, name: "Mike Torres", type: "driver" },
        { id: 10, name: "Dana Petrov", type: "driver" },
        { id: 11, name: "Sam Ibarra", type: "operator" },
      ]
  );
  const [jobs, setJobs] = useState(
    () =>
      persisted?.jobs || [
        { id: 1, name: "Curtis Bay", location: "Site A" },
        { id: 2, name: "Solo Gibbs Hut", location: "Site B" },
        { id: 3, name: "Patterson Park", location: "Site C" },
      ]
  );
  // assignment: { id, resourceId, jobId, day, parentAssignmentId }
  // crew (top-level, level 0): parentAssignmentId = null, jobId/day = real location
  // equipment (level 1): parentAssignmentId = <crew assignment id>
  // attachment (level 2): parentAssignmentId = <equipment assignment id>
  const [assignments, setAssignments] = useState(() => {
    if (persisted?.assignments) return persisted.assignments;
    const crewA = { id: nextId(), resourceId: 2, jobId: 1, day: 0, parentAssignmentId: null };
    const crewB = { id: nextId(), resourceId: 2, jobId: 1, day: 1, parentAssignmentId: null };
    const crewC = { id: nextId(), resourceId: 3, jobId: 2, day: 2, parentAssignmentId: null };
    const equipA = { id: nextId(), resourceId: 4, jobId: null, day: null, parentAssignmentId: crewA.id };
    const truckA = { id: nextId(), resourceId: 5, jobId: null, day: null, parentAssignmentId: crewC.id };
    return [
      crewA,
      crewB,
      equipA,
      { id: nextId(), resourceId: 7, jobId: null, day: null, parentAssignmentId: equipA.id },
      { id: nextId(), resourceId: 8, jobId: null, day: null, parentAssignmentId: equipA.id },
      { id: nextId(), resourceId: 11, jobId: null, day: null, parentAssignmentId: equipA.id },
      crewC,
      truckA,
      { id: nextId(), resourceId: 9, jobId: null, day: null, parentAssignmentId: truckA.id },
    ];
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ resources, jobs, assignments }));
    } catch {
      // localStorage unavailable (private browsing, quota, etc.) - data just won't persist
    }
  }, [resources, jobs, assignments]);

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedResourceId, setSelectedResourceId] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);
  const [invalidDropCell, setInvalidDropCell] = useState(null);
  const [copySource, setCopySource] = useState(null);
  const [blockedMessage, setBlockedMessageRaw] = useState(null);
  const blockedTimeout = useRef(null);
  function setBlockedMessage(msg, duration = 2600) {
    setBlockedMessageRaw(msg);
    if (blockedTimeout.current) clearTimeout(blockedTimeout.current);
    blockedTimeout.current = setTimeout(() => setBlockedMessageRaw(null), duration);
  }
  const [addJobOpen, setAddJobOpen] = useState(false);
  const [addResourceOpen, setAddResourceOpen] = useState(false);
  const [newJobName, setNewJobName] = useState("");
  const [newResName, setNewResName] = useState("");
  const [newResType, setNewResType] = useState("crew");
  const dragResourceId = useRef(null);
  const dragAssignmentId = useRef(null);

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date());
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  }, [weekOffset]);

  const dayDates = useMemo(
    () => DAY_LABELS.map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    }),
    [weekStart]
  );

  const resourceById = useMemo(() => {
    const m = {};
    resources.forEach((r) => (m[r.id] = r));
    return m;
  }, [resources]);

  const assignmentById = useMemo(() => {
    const m = {};
    assignments.forEach((a) => (m[a.id] = a));
    return m;
  }, [assignments]);

  function effectiveDay(a) {
    let cur = a;
    let guard = 0;
    while (cur.parentAssignmentId != null && guard < 10) {
      const parent = assignmentById[cur.parentAssignmentId];
      if (!parent) return null;
      cur = parent;
      guard += 1;
    }
    return cur.day;
  }

  const conflictKeys = useMemo(() => {
    const counts = {};
    assignments.forEach((a) => {
      const day = effectiveDay(a);
      if (day == null) return;
      const key = `${a.resourceId}-${day}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    const conflicted = new Set();
    Object.entries(counts).forEach(([key, count]) => {
      if (count > 1) conflicted.add(key);
    });
    return conflicted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, assignmentById]);

  function isConflicted(resourceId, day) {
    return conflictKeys.has(`${resourceId}-${day}`);
  }

  function isResourceAvailable(resourceId, day, excludeAssignmentId) {
    if (day == null) return true;
    return !assignments.some((a) => {
      if (a.id === excludeAssignmentId) return false;
      if (a.resourceId !== resourceId) return false;
      return effectiveDay(a) === day;
    });
  }

  function crewAssignmentsFor(jobId, day) {
    return assignments.filter((a) => a.parentAssignmentId == null && a.jobId === jobId && a.day === day);
  }
  function childAssignmentsOf(parentAssignmentId) {
    return assignments.filter((a) => a.parentAssignmentId === parentAssignmentId);
  }

  function placeCrew(resourceId, jobId, day, movingAssignmentId) {
    if (!isResourceAvailable(resourceId, day, movingAssignmentId)) {
      setBlockedMessage(`${resourceById[resourceId]?.name || "That resource"} is already scheduled on this day.`);
      return false;
    }
    setAssignments((prev) => {
      if (movingAssignmentId != null) {
        return prev.map((a) =>
          a.id === movingAssignmentId ? { ...a, jobId, day, parentAssignmentId: null } : a
        );
      }
      const already = prev.some(
        (a) => a.parentAssignmentId == null && a.resourceId === resourceId && a.jobId === jobId && a.day === day
      );
      if (already) return prev;
      return [...prev, { id: nextId(), resourceId, jobId, day, parentAssignmentId: null }];
    });
    return true;
  }

  function placeChild(resourceId, parentAssignmentId, movingAssignmentId) {
    const res = resourceById[resourceId];
    if (res && res.outOfService) {
      setBlockedMessage(`${res.name} is marked out of service and can't be scheduled.`);
      return false;
    }
    const parent = assignmentById[parentAssignmentId];
    const targetDay = parent ? effectiveDay(parent) : null;
    if (!isResourceAvailable(resourceId, targetDay, movingAssignmentId)) {
      setBlockedMessage(`${resourceById[resourceId]?.name || "That resource"} is already scheduled on this day.`);
      return false;
    }
    setAssignments((prev) => {
      if (movingAssignmentId != null) {
        return prev.map((a) =>
          a.id === movingAssignmentId ? { ...a, jobId: null, day: null, parentAssignmentId } : a
        );
      }
      const already = prev.some(
        (a) => a.parentAssignmentId === parentAssignmentId && a.resourceId === resourceId
      );
      if (already) return prev;
      return [...prev, { id: nextId(), resourceId, jobId: null, day: null, parentAssignmentId }];
    });
    return true;
  }

  function removeAssignment(assignmentId) {
    setAssignments((prev) => removeWithDescendants(prev, [assignmentId]));
  }

  function getDescendants(rootId) {
    const direct = assignments.filter((a) => a.parentAssignmentId === rootId);
    let all = [...direct];
    direct.forEach((d) => {
      all = all.concat(getDescendants(d.id));
    });
    return all;
  }

  function copyCrewToTarget(crewAssignment, targetJobId, targetDay) {
    if (!isResourceAvailable(crewAssignment.resourceId, targetDay, null)) {
      setBlockedMessage(
        `${resourceById[crewAssignment.resourceId]?.name || "This crew"} is already scheduled on ${DAY_LABELS[targetDay]}.`
      );
      return;
    }
    const descendants = getDescendants(crewAssignment.id);
    const idMap = {};
    const newCrew = {
      id: nextId(),
      resourceId: crewAssignment.resourceId,
      jobId: targetJobId,
      day: targetDay,
      parentAssignmentId: null,
    };
    idMap[crewAssignment.id] = newCrew.id;
    const added = [newCrew];
    const skipped = [];
    descendants.forEach((orig) => {
      const newParentId = idMap[orig.parentAssignmentId];
      if (newParentId == null) return;
      if (!isResourceAvailable(orig.resourceId, targetDay, null)) {
        skipped.push(resourceById[orig.resourceId]?.name || "an item");
        return;
      }
      const newA = { id: nextId(), resourceId: orig.resourceId, jobId: null, day: null, parentAssignmentId: newParentId };
      idMap[orig.id] = newA.id;
      added.push(newA);
    });
    setAssignments((prev) => [...prev, ...added]);
    const targetJob = jobs.find((j) => j.id === targetJobId);
    if (skipped.length > 0) {
      setBlockedMessage(
        `Copied to ${targetJob ? targetJob.name + ", " : ""}${DAY_LABELS[targetDay]}, but skipped (already scheduled that day): ${skipped.join(", ")}.`
      );
    }
  }

  function handlePoolDragStart(e, resourceId) {
    dragResourceId.current = resourceId;
    dragAssignmentId.current = null;
    e.dataTransfer.effectAllowed = "copy";
  }

  function handleChipDragStart(e, resourceId, assignmentId) {
    dragResourceId.current = resourceId;
    dragAssignmentId.current = assignmentId;
    e.dataTransfer.effectAllowed = "move";
  }

  function draggedType() {
    const rid = dragResourceId.current;
    if (rid == null) return null;
    const r = resourceById[rid];
    return r ? r.type : null;
  }

  function handleCellDragOver(e, jobId, day) {
    e.preventDefault();
    const cellKey = `${jobId}-${day}`;
    const type = draggedType();
    const rid = dragResourceId.current;
    if (LEVEL2_TYPES.includes(type)) {
      setInvalidDropCell(cellKey);
      setDragOverCell(null);
      return;
    }
    if (EQUIPMENT_TIER_TYPES.includes(type)) {
      const crews = crewAssignmentsFor(jobId, day);
      const oos = resourceById[rid]?.outOfService;
      if (crews.length !== 1 || oos || !isResourceAvailable(rid, day, dragAssignmentId.current)) {
        setInvalidDropCell(cellKey);
        setDragOverCell(null);
        return;
      }
    }
    if (type === "crew" && !isResourceAvailable(rid, day, dragAssignmentId.current)) {
      setInvalidDropCell(cellKey);
      setDragOverCell(null);
      return;
    }
    setInvalidDropCell(null);
    setDragOverCell(cellKey);
  }

  function handleCellDrop(e, jobId, day) {
    e.preventDefault();
    setDragOverCell(null);
    setInvalidDropCell(null);
    const type = draggedType();
    if (type === "crew") {
      placeCrew(dragResourceId.current, jobId, day, dragAssignmentId.current);
    } else if (EQUIPMENT_TIER_TYPES.includes(type)) {
      const crews = crewAssignmentsFor(jobId, day);
      if (crews.length === 1) {
        placeChild(dragResourceId.current, crews[0].id, dragAssignmentId.current);
      }
    }
    dragResourceId.current = null;
    dragAssignmentId.current = null;
  }

  function handleCrewBlockDrop(e, crewAssignment) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCell(null);
    setInvalidDropCell(null);
    const type = draggedType();
    if (EQUIPMENT_TIER_TYPES.includes(type)) {
      placeChild(dragResourceId.current, crewAssignment.id, dragAssignmentId.current);
    } else if (type === "crew") {
      placeCrew(dragResourceId.current, crewAssignment.jobId, crewAssignment.day, dragAssignmentId.current);
    } else if (LEVEL2_TYPES.includes(type)) {
      const equip = childAssignmentsOf(crewAssignment.id);
      if (equip.length === 1) placeChild(dragResourceId.current, equip[0].id, dragAssignmentId.current);
    }
    dragResourceId.current = null;
    dragAssignmentId.current = null;
  }

  function handleEquipmentBlockDrop(e, equipAssignment) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCell(null);
    setInvalidDropCell(null);
    const type = draggedType();
    if (LEVEL2_TYPES.includes(type)) {
      placeChild(dragResourceId.current, equipAssignment.id, dragAssignmentId.current);
    } else if (EQUIPMENT_TIER_TYPES.includes(type)) {
      placeChild(dragResourceId.current, equipAssignment.parentAssignmentId, dragAssignmentId.current);
    }
    dragResourceId.current = null;
    dragAssignmentId.current = null;
  }

  function handlePoolDrop(e) {
    e.preventDefault();
    if (dragAssignmentId.current != null) {
      removeAssignment(dragAssignmentId.current);
    }
    dragResourceId.current = null;
    dragAssignmentId.current = null;
  }

  function handleCellClick(jobId, day) {
    if (copySource != null) {
      copyCrewToTarget(copySource, jobId, day);
      setCopySource(null);
      return;
    }
    if (selectedResourceId == null) return;
    const r = resourceById[selectedResourceId];
    if (!r) return;
    if (r.type === "crew") {
      if (placeCrew(selectedResourceId, jobId, day, null)) setSelectedResourceId(null);
    } else if (EQUIPMENT_TIER_TYPES.includes(r.type)) {
      const crews = crewAssignmentsFor(jobId, day);
      if (crews.length === 1) {
        if (placeChild(selectedResourceId, crews[0].id, null)) setSelectedResourceId(null);
      }
    }
  }

  function handleCrewBlockClick(e, crewAssignment) {
    e.stopPropagation();
    if (selectedResourceId == null) return;
    const r = resourceById[selectedResourceId];
    if (!r) return;
    if (EQUIPMENT_TIER_TYPES.includes(r.type)) {
      if (placeChild(selectedResourceId, crewAssignment.id, null)) setSelectedResourceId(null);
    } else if (LEVEL2_TYPES.includes(r.type)) {
      const equip = childAssignmentsOf(crewAssignment.id);
      if (equip.length === 1) {
        if (placeChild(selectedResourceId, equip[0].id, null)) setSelectedResourceId(null);
      }
    }
  }

  function handleEquipmentBlockClick(e, equipAssignment) {
    e.stopPropagation();
    if (selectedResourceId == null) return;
    const r = resourceById[selectedResourceId];
    if (r && LEVEL2_TYPES.includes(r.type)) {
      if (placeChild(selectedResourceId, equipAssignment.id, null)) setSelectedResourceId(null);
    }
  }

  function addJob() {
    const lines = newJobName.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) return;
    const parsed = lines.map((line) => {
      const commaIdx = line.indexOf(",");
      if (commaIdx === -1) return { name: line, location: "—" };
      const name = line.slice(0, commaIdx).trim();
      const location = line.slice(commaIdx + 1).trim() || "—";
      return { name: name || line, location };
    });
    setJobs((prev) => [...prev, ...parsed.map((p) => ({ id: nextId(), ...p }))]);
    setNewJobName("");
    setAddJobOpen(false);
  }

  function addResource() {
    const names = newResName
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    if (names.length === 0) return;
    setResources((prev) => [
      ...prev,
      ...names.map((name) => ({ id: nextId(), name, type: newResType })),
    ]);
    setNewResName("");
    setAddResourceOpen(false);
  }

  function removeJob(jobId) {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    setAssignments((prev) => {
      const rootIds = prev.filter((a) => a.parentAssignmentId == null && a.jobId === jobId).map((a) => a.id);
      return removeWithDescendants(prev, rootIds);
    });
  }

  function removeResource(resourceId) {
    setResources((prev) => prev.filter((r) => r.id !== resourceId));
    setAssignments((prev) => {
      const rootIds = prev.filter((a) => a.resourceId === resourceId).map((a) => a.id);
      return removeWithDescendants(prev, rootIds);
    });
  }

  function toggleOutOfService(resourceId) {
    const res = resourceById[resourceId];
    const turningOn = res && !res.outOfService;
    if (turningOn) {
      const activeDays = assignments
        .filter((a) => a.resourceId === resourceId)
        .map((a) => effectiveDay(a))
        .filter((d) => d != null);
      const uniqueDays = [...new Set(activeDays)].sort((a, b) => a - b);
      if (uniqueDays.length > 0) {
        const dayList = uniqueDays.map((d) => DAY_LABELS[d]).join(", ");
        setBlockedMessage(
          `${res.name} marked out of service — it's still on the board for ${dayList}. Those bookings are now flagged (grayed out, locked from moving); remove or swap them when you get a chance.`,
          5000
        );
      }
    }
    setResources((prev) =>
      prev.map((r) => (r.id === resourceId ? { ...r, outOfService: !r.outOfService } : r))
    );
  }

  const styles = {
    root: {
      background: "#15171B",
      color: "#EDEBE4",
      fontFamily: "'Inter', system-ui, sans-serif",
      minHeight: "600px",
      borderRadius: "10px",
      overflow: "hidden",
      border: "1px solid #2C3036",
    },
    header: {
      background: "#1B1E23",
      borderBottom: "2px solid #FF6A1F",
      padding: "16px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "12px",
    },
    title: {
      fontFamily: "'Oswald', sans-serif",
      fontWeight: 600,
      fontSize: "22px",
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: "#F5F3EC",
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    weekNav: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      background: "#22262C",
      border: "1px solid #33383E",
      borderRadius: "8px",
      padding: "4px 6px",
    },
    navBtn: {
      background: "transparent",
      border: "none",
      color: "#9CA3AC",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      padding: "4px",
      borderRadius: "6px",
    },
    weekLabel: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "13px",
      color: "#EDEBE4",
      padding: "0 6px",
      minWidth: "150px",
      textAlign: "center",
    },
    addBtn: {
      background: "#FF6A1F",
      color: "#2A1400",
      border: "none",
      borderRadius: "7px",
      padding: "8px 14px",
      fontSize: "13px",
      fontWeight: 600,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontFamily: "'Inter', sans-serif",
    },
    addBtnGhost: {
      background: "transparent",
      color: "#EDEBE4",
      border: "1px solid #3A3F46",
      borderRadius: "7px",
      padding: "8px 14px",
      fontSize: "13px",
      fontWeight: 600,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontFamily: "'Inter', sans-serif",
    },
    body: {
      display: "flex",
      minHeight: "460px",
    },
    sidebar: {
      width: "230px",
      flexShrink: 0,
      background: "#191C21",
      borderRight: "1px solid #2C3036",
      padding: "16px 12px",
    },
    sectionLabel: {
      fontFamily: "'Oswald', sans-serif",
      fontSize: "11px",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "#7C828C",
      margin: "14px 4px 8px",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    poolArea: {
      minHeight: "60px",
      borderRadius: "8px",
    },
    grid: {
      flex: 1,
      overflowX: "auto",
      padding: "16px",
    },
    gridTable: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: "6px",
      minWidth: "800px",
    },
    dayHeaderCell: {
      fontFamily: "'Oswald', sans-serif",
      fontSize: "12px",
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: "#9CA3AC",
      textAlign: "center",
      paddingBottom: "6px",
    },
    dayDate: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "11px",
      color: "#5F656E",
      display: "block",
      marginTop: "2px",
    },
    jobCell: {
      background: "#1E2126",
      borderRadius: "8px",
      padding: "10px 12px",
      minWidth: "150px",
      verticalAlign: "top",
    },
    jobName: {
      fontFamily: "'Oswald', sans-serif",
      fontSize: "14px",
      fontWeight: 500,
      color: "#F5F3EC",
      letterSpacing: "0.02em",
    },
    jobLoc: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "11px",
      color: "#6C7178",
    },
    dayCell: {
      background: "#1B1E23",
      border: "1px solid #2A2E34",
      borderRadius: "8px",
      minWidth: "124px",
      minHeight: "72px",
      verticalAlign: "top",
      padding: "6px",
      transition: "background 120ms, border-color 120ms",
    },
    panel: {
      background: "#1E2126",
      border: "1px solid #33383E",
      borderRadius: "8px",
      padding: "14px",
      marginBottom: "14px",
    },
    input: {
      background: "#15171B",
      border: "1px solid #3A3F46",
      borderRadius: "6px",
      color: "#EDEBE4",
      padding: "7px 10px",
      fontSize: "13px",
      fontFamily: "'Inter', sans-serif",
      width: "100%",
      marginBottom: "8px",
      boxSizing: "border-box",
    },
  };

  function ResourceIcon({ type, size = 13 }) {
    if (type === "crew") return <Users size={size} aria-hidden="true" />;
    if (type === "equipment") return <Wrench size={size} aria-hidden="true" />;
    if (type === "dumptruck") return <Truck size={size} aria-hidden="true" />;
    if (type === "driver") return <User size={size} aria-hidden="true" />;
    if (type === "operator") return <UserCog size={size} aria-hidden="true" />;
    return <Link2 size={size} aria-hidden="true" />;
  }

  function Chip({ resource, onDragStart, onRemove, onCopy, onToggleOOS, conflicted, dense }) {
    const color = TYPE_COLORS[resource.type] || TYPE_COLORS.crew;
    const scale = TYPE_SCALE[resource.type] || TYPE_SCALE.crew;
    const selected = selectedResourceId === resource.id;
    const oos = !!resource.outOfService;
    return (
      <div
        draggable={!oos}
        onDragStart={oos ? (e) => e.preventDefault() : onDragStart}
        onClick={(e) => {
          e.stopPropagation();
          if (onRemove || oos) return;
          setSelectedResourceId(selected ? null : resource.id);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: oos ? "#3A3D42" : color.fill,
          color: oos ? "#9CA3AC" : color.text,
          borderRadius: "6px",
          padding: dense ? scale.densePad : scale.pad,
          fontSize: `${dense ? scale.denseFont : scale.font}px`,
          fontWeight: 600,
          cursor: oos ? "not-allowed" : "grab",
          marginBottom: dense ? "5px" : "8px",
          boxShadow: selected
            ? "0 0 0 2px #FF6A1F, 0 2px 6px rgba(0,0,0,0.35)"
            : "0 2px 6px rgba(0,0,0,0.35)",
          outline: conflicted ? "2px solid #E5484D" : oos ? "1px dashed #E5484D" : "none",
          outlineOffset: "1px",
          position: "relative",
          userSelect: "none",
          opacity: oos ? 0.8 : 1,
        }}
        title={oos ? `${resource.name} — out of service` : resource.name}
      >
        <ResourceIcon type={resource.type} size={scale.icon} />
        <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: oos ? "line-through" : "none" }}>
          {resource.name}
        </span>
        {oos && (
          <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.04em", color: "#E5484D" }}>
            OOS
          </span>
        )}
        {conflicted && <AlertTriangle size={13} color="#7A1418" aria-label="Double-booked" />}
        {onToggleOOS && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleOOS();
            }}
            style={{
              background: "rgba(0,0,0,0.15)",
              border: "none",
              borderRadius: "4px",
              color: oos ? "#9CA3AC" : color.text,
              cursor: "pointer",
              display: "flex",
              padding: "2px",
            }}
            aria-label={oos ? `Mark ${resource.name} back in service` : `Mark ${resource.name} out of service`}
            title={oos ? "Mark back in service" : "Mark out of service"}
          >
            <Ban size={11} />
          </button>
        )}
        {onCopy && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopy();
            }}
            style={{
              background: "rgba(0,0,0,0.15)",
              border: "none",
              borderRadius: "4px",
              color: color.text,
              cursor: "pointer",
              display: "flex",
              padding: "2px",
            }}
            aria-label={`Copy ${resource.name} to the next day`}
            title="Copy to next day"
          >
            <Copy size={11} />
          </button>
        )}
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            style={{
              background: "rgba(0,0,0,0.15)",
              border: "none",
              borderRadius: "4px",
              color: color.text,
              cursor: "pointer",
              display: "flex",
              padding: "2px",
            }}
            aria-label={`Remove ${resource.name} from this slot`}
          >
            <X size={11} />
          </button>
        )}
      </div>
    );
  }

  function NestedBlock({ children, onDropHandler, onClickHandler }) {
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={onDropHandler}
        onClick={onClickHandler}
        style={{ marginLeft: "10px", borderLeft: "2px solid #33383E", paddingLeft: "8px", marginTop: "2px" }}
      >
        {children}
      </div>
    );
  }

  const crews = resources.filter((r) => r.type === "crew");
  const equipmentPool = resources.filter((r) => r.type === "equipment");
  const dumpTruckPool = resources.filter((r) => r.type === "dumptruck");
  const attachmentPool = resources.filter((r) => r.type === "attachment");
  const driverPool = resources.filter((r) => r.type === "driver");
  const operatorPool = resources.filter((r) => r.type === "operator");

  return (
    <div style={styles.root} className="crew-board-print-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        @media print {
          .no-print { display: none !important; }
          .crew-board-print-root {
            background: #ffffff !important;
            color: #111111 !important;
            border: none !important;
            min-height: 0 !important;
          }
          .crew-board-print-root * {
            box-shadow: none !important;
          }
          .print-header {
            background: #ffffff !important;
            border-bottom: 2px solid #111111 !important;
          }
          .print-title {
            color: #111111 !important;
          }
          .print-week-label {
            color: #111111 !important;
          }
          .print-cell {
            background: #ffffff !important;
            border: 1px solid #999999 !important;
          }
        }
      `}</style>

      <div style={styles.header} className="print-header">
        <div style={styles.title} className="print-title">
          <HardHat size={22} color="#FF6A1F" aria-hidden="true" />
          Crew Board
        </div>
        <div style={styles.weekNav}>
          <button style={styles.navBtn} className="no-print" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Previous week">
            <ChevronLeft size={16} />
          </button>
          <span style={styles.weekLabel} className="print-week-label">
            {formatShort(dayDates[0])} – {formatShort(dayDates[5])}
          </span>
          <button style={styles.navBtn} className="no-print" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Next week">
            <ChevronRight size={16} />
          </button>
          {weekOffset !== 0 && (
            <button
              style={{ ...styles.navBtn, fontSize: "11px", color: "#FF6A1F" }}
              className="no-print"
              onClick={() => setWeekOffset(0)}
            >
              Today
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px" }} className="no-print">
          <button style={styles.addBtnGhost} onClick={() => window.print()}>
            <Printer size={14} /> Print
          </button>
          <button style={styles.addBtnGhost} onClick={() => setAddResourceOpen((v) => !v)}>
            <Plus size={14} /> Resource
          </button>
          <button style={styles.addBtn} onClick={() => setAddJobOpen((v) => !v)}>
            <Plus size={14} /> Job
          </button>
        </div>
      </div>

      {copySource && (
        <div
          className="no-print"
          style={{
            background: "#1E2A3A",
            borderBottom: "1px solid #3B82F6",
            color: "#BFDBFE",
            fontSize: "12.5px",
            fontFamily: "'Inter', sans-serif",
            padding: "8px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Copy size={14} aria-hidden="true" />
            Copying {resourceById[copySource.resourceId]?.name || "crew"} — click any day (any job) to place the copy.
          </div>
          <button
            onClick={() => setCopySource(null)}
            style={{
              background: "transparent",
              border: "1px solid #3B82F6",
              color: "#BFDBFE",
              borderRadius: "6px",
              padding: "3px 10px",
              fontSize: "11px",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {blockedMessage && (
        <div
          className="no-print"
          style={{
            background: "#3A1416",
            borderBottom: "1px solid #E5484D",
            color: "#F5B5B7",
            fontSize: "12.5px",
            fontFamily: "'Inter', sans-serif",
            padding: "8px 20px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertTriangle size={14} aria-hidden="true" />
          {blockedMessage}
        </div>
      )}

      {(addJobOpen || addResourceOpen) && (
        <div style={{ padding: "0 20px", paddingTop: "14px" }} className="no-print">
          {addJobOpen && (
            <div style={styles.panel}>
              <div style={{ ...styles.sectionLabel, margin: "0 0 8px" }}>New job(s)</div>
              <div style={{ fontSize: "11px", color: "#7C828C", marginBottom: "6px" }}>
                One job per line. Add a location after a comma if you want one — Curtis Bay, Site A.
              </div>
              <textarea
                style={{ ...styles.input, minHeight: "90px", resize: "vertical", fontFamily: "'Inter', sans-serif" }}
                placeholder={"Curtis Bay, Site A\nSolo Gibbs Hut, Site B\nPatterson Park"}
                value={newJobName}
                onChange={(e) => setNewJobName(e.target.value)}
              />
              {(() => {
                const count = newJobName.split("\n").map((l) => l.trim()).filter((l) => l.length > 0).length;
                return count === 0 ? (
                  <div style={{ fontSize: "12px", color: "#E5484D", marginBottom: "8px" }}>
                    Enter at least one job first
                  </div>
                ) : (
                  <div style={{ fontSize: "12px", color: "#7C828C", marginBottom: "8px" }}>
                    Will add {count} job{count === 1 ? "" : "s"}
                  </div>
                );
              })()}
              <div style={{ display: "flex", gap: "8px" }}>
                <button style={styles.addBtn} onClick={addJob}>Add job(s)</button>
                <button style={styles.addBtnGhost} onClick={() => setAddJobOpen(false)}>Cancel</button>
              </div>
            </div>
          )}
          {addResourceOpen && (
            <div style={styles.panel}>
              <div style={{ ...styles.sectionLabel, margin: "0 0 8px" }}>New resource(s)</div>
              <div style={{ fontSize: "11px", color: "#7C828C", marginBottom: "6px" }}>
                One name per line to add several at once — they'll all be added as the type selected below.
              </div>
              <textarea
                style={{ ...styles.input, minHeight: "90px", resize: "vertical", fontFamily: "'Inter', sans-serif" }}
                placeholder={"Grading Crew\nExcavation Crew B\nDemo Crew"}
                value={newResName}
                onChange={(e) => setNewResName(e.target.value)}
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", marginBottom: "8px", fontSize: "13px" }}>
                {["crew", "equipment", "dumptruck", "attachment", "driver", "operator"].map((t) => (
                  <label key={t} style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                    <input type="radio" checked={newResType === t} onChange={() => setNewResType(t)} />
                    {TYPE_LABELS[t]}
                  </label>
                ))}
              </div>
              {(() => {
                const count = newResName.split("\n").map((n) => n.trim()).filter((n) => n.length > 0).length;
                return count === 0 ? (
                  <div style={{ fontSize: "12px", color: "#E5484D", marginBottom: "8px" }}>
                    Enter at least one resource name first
                  </div>
                ) : (
                  <div style={{ fontSize: "12px", color: "#7C828C", marginBottom: "8px" }}>
                    Will add {count} {TYPE_LABELS[newResType].toLowerCase()}{count === 1 ? "" : "s"}
                  </div>
                );
              })()}
              <div style={{ display: "flex", gap: "8px" }}>
                <button style={styles.addBtn} onClick={addResource}>Add resource(s)</button>
                <button style={styles.addBtnGhost} onClick={() => setAddResourceOpen(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={styles.body}>
        <div
          style={styles.sidebar}
          className="no-print"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handlePoolDrop}
          onClick={() => {
            setSelectedResourceId(null);
            setCopySource(null);
          }}
        >
          <div style={{ fontSize: "11px", color: "#5F656E", lineHeight: 1.5, marginBottom: "4px" }}>
            Crews go on the board first. Excavators and dump trucks nest under a crew. Attachments, drivers, and
            operators nest under an excavator or a dump truck — drop
            directly on the excavator's block (or on its crew, if that crew has only one excavator).
            A resource can only be scheduled in one place per day. Click the copy icon on a placed crew, then click
            any day (on any job) to duplicate the whole crew — excavators, trucks, attachments, drivers,
            operators — into that slot. Click the ban icon on an excavator or dump truck in the sidebar to mark it
            out of service — it can't be scheduled until you switch it back.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <div
                key={type}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "10px",
                  color: "#7C828C",
                }}
              >
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: color.fill, flexShrink: 0 }} />
                {TYPE_LABELS[type]}
              </div>
            ))}
          </div>
          <div style={styles.sectionLabel}><Users size={12} /> Crews</div>
          <div style={styles.poolArea}>
            {crews.map((r) => (
              <Chip key={r.id} resource={r} onDragStart={(e) => handlePoolDragStart(e, r.id)} onRemove={() => removeResource(r.id)} />
            ))}
            {crews.length === 0 && <div style={{ fontSize: "12px", color: "#5F656E" }}>No crews yet</div>}
          </div>
          <div style={styles.sectionLabel}><Wrench size={12} /> Excavators</div>
          <div style={styles.poolArea}>
            {equipmentPool.map((r) => (
              <Chip
                key={r.id}
                resource={r}
                onDragStart={(e) => handlePoolDragStart(e, r.id)}
                onRemove={() => removeResource(r.id)}
                onToggleOOS={() => toggleOutOfService(r.id)}
              />
            ))}
            {equipmentPool.length === 0 && <div style={{ fontSize: "12px", color: "#5F656E" }}>No excavators yet</div>}
          </div>
          <div style={styles.sectionLabel}><Truck size={12} /> Dump Trucks</div>
          <div style={styles.poolArea}>
            {dumpTruckPool.map((r) => (
              <Chip
                key={r.id}
                resource={r}
                onDragStart={(e) => handlePoolDragStart(e, r.id)}
                onRemove={() => removeResource(r.id)}
                onToggleOOS={() => toggleOutOfService(r.id)}
              />
            ))}
            {dumpTruckPool.length === 0 && <div style={{ fontSize: "12px", color: "#5F656E" }}>No dump trucks yet</div>}
          </div>
          <div style={styles.sectionLabel}><Link2 size={12} /> Attachments</div>
          <div style={styles.poolArea}>
            {attachmentPool.map((r) => (
              <Chip key={r.id} resource={r} onDragStart={(e) => handlePoolDragStart(e, r.id)} onRemove={() => removeResource(r.id)} />
            ))}
            {attachmentPool.length === 0 && <div style={{ fontSize: "12px", color: "#5F656E" }}>No attachments yet</div>}
          </div>
          <div style={styles.sectionLabel}><User size={12} /> Drivers</div>
          <div style={styles.poolArea}>
            {driverPool.map((r) => (
              <Chip key={r.id} resource={r} onDragStart={(e) => handlePoolDragStart(e, r.id)} onRemove={() => removeResource(r.id)} />
            ))}
            {driverPool.length === 0 && <div style={{ fontSize: "12px", color: "#5F656E" }}>No drivers yet</div>}
          </div>
          <div style={styles.sectionLabel}><UserCog size={12} /> Operators</div>
          <div style={styles.poolArea}>
            {operatorPool.map((r) => (
              <Chip key={r.id} resource={r} onDragStart={(e) => handlePoolDragStart(e, r.id)} onRemove={() => removeResource(r.id)} />
            ))}
            {operatorPool.length === 0 && <div style={{ fontSize: "12px", color: "#5F656E" }}>No operators yet</div>}
          </div>
        </div>

        <div style={styles.grid}>
          <table style={styles.gridTable}>
            <thead>
              <tr>
                <th></th>
                {DAY_LABELS.map((d, i) => (
                  <th key={d} style={styles.dayHeaderCell}>
                    {d}
                    <span style={styles.dayDate}>{formatShort(dayDates[i])}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td style={styles.jobCell} className="print-cell">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
                      <div>
                        <div style={styles.jobName} className="print-title">{job.name}</div>
                        <div style={styles.jobLoc}>{job.location}</div>
                      </div>
                      <button
                        onClick={() => removeJob(job.id)}
                        className="no-print"
                        style={{ background: "transparent", border: "none", color: "#5F656E", cursor: "pointer", padding: "2px" }}
                        aria-label={`Remove ${job.name}`}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </td>
                  {DAY_LABELS.map((_, day) => {
                    const cellKey = `${job.id}-${day}`;
                    const crewBlocks = crewAssignmentsFor(job.id, day);
                    const isOver = dragOverCell === cellKey;
                    const isInvalid = invalidDropCell === cellKey;
                    return (
                      <td
                        key={day}
                        className="print-cell"
                        style={{
                          ...styles.dayCell,
                          background: isOver ? "#262A2F" : styles.dayCell.background,
                          borderColor: isInvalid ? "#E5484D" : isOver ? "#FF6A1F" : styles.dayCell.border,
                        }}
                        onDragOver={(e) => handleCellDragOver(e, job.id, day)}
                        onDragLeave={() => {
                          setDragOverCell((c) => (c === cellKey ? null : c));
                          setInvalidDropCell((c) => (c === cellKey ? null : c));
                        }}
                        onDrop={(e) => handleCellDrop(e, job.id, day)}
                        onClick={() => handleCellClick(job.id, day)}
                      >
                        {crewBlocks.map((crewA) => {
                          const crewRes = resourceById[crewA.resourceId];
                          if (!crewRes) return null;
                          const equipKids = childAssignmentsOf(crewA.id);
                          return (
                            <div key={crewA.id} style={{ marginBottom: "6px" }}>
                              <div
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onDrop={(e) => handleCrewBlockDrop(e, crewA)}
                                onClick={(e) => handleCrewBlockClick(e, crewA)}
                              >
                                <Chip
                                  resource={crewRes}
                                  dense
                                  conflicted={isConflicted(crewRes.id, day)}
                                  onDragStart={(e) => handleChipDragStart(e, crewRes.id, crewA.id)}
                                  onRemove={() => removeAssignment(crewA.id)}
                                  onCopy={() => setCopySource(crewA)}
                                />
                              </div>
                              <NestedBlock>
                                {equipKids.map((eqA) => {
                                  const eqRes = resourceById[eqA.resourceId];
                                  if (!eqRes) return null;
                                  const attachKids = childAssignmentsOf(eqA.id);
                                  return (
                                    <div key={eqA.id} style={{ marginBottom: "4px" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                                        <CornerDownRight size={11} color="#4A4F57" style={{ flexShrink: 0 }} aria-hidden="true" />
                                        <div
                                          style={{ flex: 1 }}
                                          onDragOver={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                          }}
                                          onDrop={(e) => handleEquipmentBlockDrop(e, eqA)}
                                          onClick={(e) => handleEquipmentBlockClick(e, eqA)}
                                        >
                                          <Chip
                                            resource={eqRes}
                                            dense
                                            conflicted={isConflicted(eqRes.id, day)}
                                            onDragStart={(e) => handleChipDragStart(e, eqRes.id, eqA.id)}
                                            onRemove={() => removeAssignment(eqA.id)}
                                          />
                                        </div>
                                      </div>
                                      {attachKids.length > 0 && (
                                        <div style={{ marginLeft: "16px", borderLeft: "2px solid #2A2E34", paddingLeft: "8px" }}>
                                          {attachKids.map((atA) => {
                                            const atRes = resourceById[atA.resourceId];
                                            if (!atRes) return null;
                                            return (
                                              <div key={atA.id} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                                                <CornerDownRight size={10} color="#3E434B" style={{ flexShrink: 0 }} aria-hidden="true" />
                                                <div style={{ flex: 1 }}>
                                                  <Chip
                                                    resource={atRes}
                                                    dense
                                                    conflicted={isConflicted(atRes.id, day)}
                                                    onDragStart={(e) => handleChipDragStart(e, atRes.id, atA.id)}
                                                    onRemove={() => removeAssignment(atA.id)}
                                                  />
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </NestedBlock>
                            </div>
                          );
                        })}
                        {crewBlocks.length === 0 && (
                          <div style={{ fontSize: "11px", color: "#3E434B", textAlign: "center", padding: "10px 0" }}>
                            <Pin size={12} style={{ opacity: 0.4 }} />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {jobs.length === 0 && (
            <div style={{ color: "#5F656E", fontSize: "13px", padding: "20px" }}>
              No jobs yet — add one to start scheduling.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
