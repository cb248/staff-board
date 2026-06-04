// ==========================
// HELPERS (basic utilities)
// ==========================

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getCurrentTimeMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getWeekday(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", { weekday: "long" });
}

function formatTimeLeft(endTime, currentTime) {
  const total = timeToMinutes(endTime) - currentTime;

  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (total < 60) {
    return `${total} min`;
  }

  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function formatCountdown(minutes) {
  if (!isFinite(minutes)) return "unknown";
  if (minutes < 0) return "NOW";

  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  return minutes < 60
    ? `${minutes} min`
    : `${h}h ${String(m).padStart(2, "0")}m`;
}

function getNextUpDayLabel(shiftDateTime, now) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const shiftDay = new Date(
    shiftDateTime.getFullYear(),
    shiftDateTime.getMonth(),
    shiftDateTime.getDate()
  );

  if (shiftDay.getTime() === today.getTime()) {
    return "";
  }

  if (shiftDay.getTime() === tomorrow.getTime()) {
    return " (tomorrow)";
  }

  return ` (${shiftDateTime.toLocaleDateString("en-GB", { weekday: "long" })})`;
}

// ==========================
// DERIVED HELPERS (logic)
// ==========================

function getDepartments(shifts) {
  return [...new Set(shifts.map(s => s.department))];
}

function getNextShiftForDepartment(shifts, department) {
  const now = getCurrentTimeMinutes();
  const today = getTodayDate();

  const deptShifts = shifts.filter(s => s.department === department);

  const upcoming = deptShifts.filter(s => {
    const start = timeToMinutes(s.start);

    return (
      s.date > today ||
      (s.date === today && start > now)
    );
  });

  upcoming.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return timeToMinutes(a.start) - timeToMinutes(b.start);
  });

  return upcoming[0] || null;
}

function getShiftStartDateTime(shift) {
  const cleanDate = shift.date.trim();
  const cleanTime = shift.start.trim();

  return new Date(`${cleanDate}T${cleanTime}:00`);
}

function getShiftStatus(shift) {
  const now = new Date();
  const start = new Date(`${shift.date}T${shift.start}`);
  const end = new Date(`${shift.date}T${shift.end}`);

  if (now >= start && now < end) return "active";

  const diff = (start - now) / 60000;

  if (diff < 0) return "past";
  if (diff <= 60) return "soon";

  return "normal";
}

// ==========================
// RENDER FUNCTIONS
// ==========================

/*function renderStaff(shifts) {
  const currentTime = getCurrentTimeMinutes();
  const today = getTodayDate();

  const currentStaff = (shifts || []).filter(shift => {
    const start = timeToMinutes(shift.start);
    const end = timeToMinutes(shift.end);

    return (
      shift.date === today &&
      currentTime >= start &&
      currentTime < end
    );
  });

  const staffDiv = document.getElementById("staff");

  staffDiv.innerHTML = currentStaff.map(person => {
    return `
      <div>
        <strong>${person.department}</strong><br>
        ${person.name}<br>
        Leaves in ${formatTimeLeft(person.end, currentTime)}
        <hr>
      </div>
    `;
  }).join("");
}*/

function renderNextShifts(shifts) {
  const container = document.getElementById("nextShifts");
  const departments = getDepartments(shifts);

  const nowDateTime = new Date();

  container.innerHTML = departments.map(dept => {

    const deptShifts = shifts.filter(s => s.department === dept);

    // CURRENT SHIFT
    const current = deptShifts.filter(s => {
      const start = timeToMinutes(s.start);
      const end = timeToMinutes(s.end);
      const now = getCurrentTimeMinutes();

      return (
        s.date === getTodayDate() &&
        now >= start &&
        now < end
      );
    });

    // NEXT SHIFT
    const next = getNextShiftForDepartment(shifts, dept);

    let currentHTML = "";

    if (current.length === 0) {
      currentHTML = `<div>Nothing currently scheduled</div>`;
    } else {
      currentHTML = current.map(p => {
        const minsLeft =
          timeToMinutes(p.end) - getCurrentTimeMinutes();

        const status = getShiftStatus(p);

return `
  <div class="row ${status}">
    <div><strong>${p.name}</strong></div>
    <div>${p.start}–${p.end}</div>
    <div>Leaves in ${formatTimeLeft(p.end, getCurrentTimeMinutes())} min</div>
  </div>
`;
      }).join("");
    }

    let nextHTML = "";

    if (!next) {
      nextHTML = `<div>No upcoming shifts</div>`;
    } else {
      const shiftDateTime = new Date(`${next.date}T${next.start}`);
      const now = new Date();
      const diff = Math.floor((shiftDateTime - now) / 60000);

      const abs = Math.abs(diff);
      const days = Math.floor(abs / 1440);
      const hours = Math.floor((abs % 1440) / 60);
      const mins = abs % 60;

      const time =
        days > 0
          ? `${days}d ${hours}h ${mins}m`
          : hours > 0
          ? `${hours}h ${mins}m`
          : `${mins}m`;

      const status = getShiftStatus(next);
      const label = getNextUpDayLabel(shiftDateTime, now);

nextHTML = `
  <div class="row ${status}">
    <div><strong>${next.name}</strong></div>
    <div>${next.start}</div>
    <div>Starts in ${time}${label}</div>
  </div>
`;
    }

    return `
      <div style="margin-bottom: 20px;">
        <h3>${dept.toUpperCase()}</h3>

        <strong>NOW WORKING</strong>
        ${currentHTML}

        <br>

        <strong>NEXT UP</strong>
        ${nextHTML}

        <hr>
      </div>
    `;
  }).join("");
}

// ==========================
// DATA LOADING (entry point)
// ==========================

async function loadShifts() {

  console.log("LOAD STARTED");
  console.log("Fetching sheet...");
  

  const response = await fetch(
    "https://opensheet.elk.sh/12AWhCITOL65r8jNcW50S-3ORyKxViYLHINhvQtaCNEw/Sheet1"
  );

  const data = await response.json();

  //console.log(data);
  console.log("RAW DATA:", data);

  const shifts = data.map(row => ({
    day: row.Day,
    date: row.Date,
    name: row.Name,
    department: row.Department,
    start: row.Start,
    end: row.End
  }));

  /*renderStaff(shifts);*/
  renderNextShifts(shifts);
}

loadShifts();
setInterval(loadShifts, 60000);

// ==========================
// SERVICE WORKER (ADD THIS)
// ==========================

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}
