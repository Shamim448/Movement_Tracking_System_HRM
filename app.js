const API_URL = "https://script.google.com/macros/s/AKfycbyfA4yGzddcqWlkM4i5ePAMXiccECj_oDXtEnlaJggyKi2Vyl9MBYsnu1HmZjtrrSj1/exec";

let currentUser = null;
let viewDataList = [];
let currentPage = 1;
const rowsPerPage = 100;

function showSection(sectionId) {
  document.querySelectorAll('.main-content > div').forEach(d => d.style.display = 'none');
  document.getElementById(sectionId).style.display = 'block';

  if (sectionId === 'attendanceSection' && currentUser) {
    setupAttendanceForm();
    initAutoGPS(false);
  }
  if (sectionId === 'currentPunchSection') {
    loadCurrentDatePunch();
  }
  if (sectionId === 'viewSection') {
    loadViewData();
  }
  if (sectionId === 'manageUsersSection') {
    loadManageUsers();
  }
}

// Convert Bengali digits to English digits
function convertToEnglishDigits(str) {
  if (!str) return "";
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  let converted = String(str);
  for (let i = 0; i < 10; i++) {
    converted = converted.replace(new RegExp(bengaliDigits[i], 'g'), i);
  }
  converted = converted
    .replace(/জানুয়ারি/gi, 'Jan').replace(/ফেব্রুয়ারি/gi, 'Feb')
    .replace(/মার্চ/gi, 'Mar').replace(/এপ্রিল/gi, 'Apr')
    .replace(/মে/gi, 'May').replace(/জুন/gi, 'Jun')
    .replace(/জুলাই/gi, 'Jul').replace(/আগস্ট/gi, 'Aug')
    .replace(/সেপ্টেম্বর/gi, 'Sep').replace(/অক্টোবর/gi, 'Oct')
    .replace(/নভেম্বর/gi, 'Nov').replace(/ডিসেম্বর/gi, 'Dec');
  return converted;
}

function formatBDDate(val) {
  if (!val) return "";
  let cleanVal = convertToEnglishDigits(val).replace(/^['"]/, '').trim();
  let d = new Date(cleanVal);
  if (!isNaN(d.getTime()) && (cleanVal.includes('T') || cleanVal.includes('-') || cleanVal.includes('/'))) {
    const options = { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric' };
    let formatted = new Intl.DateTimeFormat('en-GB', options).format(d);
    return formatted.replace(/(\d{2})\s([A-Za-z]{3})\s(\d{4})/, '$1-$2-$3');
  }
  return cleanVal;
}

function formatBDTime(val) {
  if (!val) return "";
  let cleanVal = convertToEnglishDigits(val).replace(/^['"]/, '').trim();
  let d = new Date(cleanVal);
  if (!isNaN(d.getTime()) && (cleanVal.includes('T') || cleanVal.includes('Z') || cleanVal.includes(':'))) {
    const options = { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true };
    return new Intl.DateTimeFormat('en-US', options).format(d);
  }
  return cleanVal;
}

function formatBDDateTimeFull(val) {
  if (!val) return "";
  let cleanVal = convertToEnglishDigits(val).replace(/^['"]/, '').trim();
  cleanVal = cleanVal.replace(',', '');

  let d = new Date(cleanVal);
  if (!isNaN(d.getTime()) && (cleanVal.includes('T') || cleanVal.includes('Z') || cleanVal.includes('/') || cleanVal.includes('-'))) {
    const dateOpts = { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric' };
    let datePart = new Intl.DateTimeFormat('en-GB', dateOpts).format(d).replace(/ /g, '-');

    const timeOpts = { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true };
    let timePart = new Intl.DateTimeFormat('en-US', timeOpts).format(d);

    return `${datePart} ${timePart}`;
  }
  return cleanVal; 
}

function getFormattedBDDateTime() {
  const now = new Date();
  const dateOptions = { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric' };
  const dateStr = new Intl.DateTimeFormat('en-GB', dateOptions).format(now).replace(/ /g, '-');

  const timeOptions = { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true };
  const timeParts = new Intl.DateTimeFormat('en-US', timeOptions).format(now).split(' ');

  return {
    date: dateStr,
    time: timeParts[0],
    ampm: timeParts[1]
  };
}

document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const userId = document.getElementById('loginUserId').value;
  const pass = document.getElementById('loginPassword').value;

  fetch(`${API_URL}?action=login&userId=${encodeURIComponent(userId)}&password=${encodeURIComponent(pass)}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        currentUser = data.user;
        document.getElementById('loginForm').reset();
        
        if (currentUser.role === 'admin') {
          document.getElementById('adminSidebar').style.display = 'flex';
          document.getElementById('mainContainer').classList.remove('full-width');
          showSection('currentPunchSection'); 
        } else {
          document.getElementById('adminSidebar').style.display = 'none';
          document.getElementById('mainContainer').classList.add('full-width');
          showSection('attendanceSection');
        }
      } else {
        alert(data.message);
      }
    })
    .catch(() => alert("Error connecting to server."));
});

function logout() {
  currentUser = null;
  const adminSidebar = document.getElementById('adminSidebar');
  if (adminSidebar) adminSidebar.style.display = 'none';

  const mainContainer = document.getElementById('mainContainer');
  if (mainContainer) mainContainer.classList.add('full-width');

  showSection('loginPage');
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.reset();
}

function setupAttendanceForm() {
  if (!currentUser) return;
  document.getElementById('dispName').innerText = currentUser.userName;
  document.getElementById('dispId').innerText = currentUser.userId;
  document.getElementById('dispDesig').innerText = currentUser.designation;
  document.getElementById('dispDept').innerText = currentUser.department;
  document.getElementById('dispSec').innerText = currentUser.section;

  const dt = getFormattedBDDateTime();
  document.getElementById('punchDate').value = dt.date;
  document.getElementById('punchTime12').value = dt.time;
  document.getElementById('punchAmPm').value = dt.ampm;
}

function initAutoGPS(isManual) {
  const statusEl = document.getElementById('gpsStatus');
  statusEl.innerText = "📍 Auto Fetching Location...";
  statusEl.style.color = "#d35400";

  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      document.getElementById('mapLink').value = mapUrl;

      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(res => res.json())
        .then(geoData => {
          document.getElementById('mapLocationName').value = geoData.display_name || "Location Detected";
          statusEl.innerText = "✅ Location Captured Successfully!";
          statusEl.style.color = "green";
        })
        .catch(() => {
          document.getElementById('mapLocationName').value = `Lat: ${lat}, Lng: ${lng}`;
          statusEl.innerText = "✅ GPS Coordinates Captured!";
          statusEl.style.color = "green";
        });
    },
    err => {
      statusEl.innerText = "⚠️ GPS Access Denied / Failed!";
      statusEl.style.color = "red";
      if (isManual || err.code === err.PERMISSION_DENIED) {
        alert("GPS Location Access Required!\n\nPlease enable location permission in your browser.");
      }
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

document.getElementById('attendanceForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const full12Time = `${document.getElementById('punchTime12').value} ${document.getElementById('punchAmPm').value}`;

  const payload = {
    action: "submitAttendance",
    userId: currentUser.userId,
    userName: currentUser.userName,
    designation: currentUser.designation,
    department: currentUser.department,
    section: currentUser.section,
    punchStatus: document.getElementById('punchStatus').value,
    punchDate: document.getElementById('punchDate').value,
    punchTime: full12Time,
    userLocation: document.getElementById('userLocation').value,
    mapLocationName: document.getElementById('mapLocationName').value,
    mapLink: document.getElementById('mapLink').value
  };

  fetch(API_URL, { method: "POST", body: JSON.stringify(payload) })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      document.getElementById('attendanceForm').reset();
      setupAttendanceForm();
      initAutoGPS(false);
    });
});

function loadCurrentDatePunch() {
  const dt = getFormattedBDDateTime();
  document.getElementById('todayLabel').innerText = dt.date;

  fetch(`${API_URL}?action=getViewData&startDate=${dt.date}&endDate=${dt.date}`)
    .then(res => res.json())
    .then(resData => {
      const tbody = document.getElementById('currentPunchTableBody');
      tbody.innerHTML = "";
      resData.data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${row[0]}</td>
          <td>${row[1]}</td>
          <td>${row[2]}</td>
          <td>${row[3]}</td>
          <td>${row[4]}</td>
          <td>${formatBDDateTimeFull(row[5])}</td>
          <td><strong>${row[6]}</strong></td>
          <td>${formatBDDate(row[7])}</td>
          <td>${formatBDTime(row[8])}</td>
          <td>${row[9]}</td>
          <td>${row[10]}</td>
          <td><a href="${row[11]}" target="_blank">View Map</a></td>
        `;
        tbody.appendChild(tr);
      });
    });
}

document.getElementById('addUserForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const payload = {
    action: "addUser",
    userId: document.getElementById('newUserId').value,
    password: document.getElementById('newPassword').value,
    userName: document.getElementById('newUserName').value,
    designation: document.getElementById('newDesignation').value,
    department: document.getElementById('newDepartment').value,
    section: document.getElementById('newSection').value,
    role: document.getElementById('newUserRole').value
  };

  fetch(API_URL, { method: "POST", body: JSON.stringify(payload) })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      document.getElementById('addUserForm').reset();
    });
});

function loadManageUsers() {
  fetch(`${API_URL}?action=getUsers`)
    .then(res => res.json())
    .then(res => {
      const tbody = document.getElementById('userTableBody');
      tbody.innerHTML = "";
      res.users.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${u.userId}</td>
          <td><input type="text" id="uname_${u.userId}" value="${u.userName}"></td>
          <td><input type="text" id="udesig_${u.userId}" value="${u.designation}"></td>
          <td><input type="text" id="udept_${u.userId}" value="${u.department}"></td>
          <td><input type="text" id="usec_${u.userId}" value="${u.section}"></td>
          <td>
            <select id="urole_${u.userId}">
              <option value="employee" ${u.role === 'employee' ? 'selected' : ''}>Employee</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </td>
          <td><input type="text" id="upass_${u.userId}" value="${u.password}"></td>
          <td>
            <button class="action-btn btn-edit" onclick="updateUser('${u.userId}')">Save</button>
            <button class="action-btn btn-del" onclick="deleteUser('${u.userId}')">Delete</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    });
}

function updateUser(userId) {
  const payload = {
    action: "updateUser",
    userId: userId,
    userName: document.getElementById(`uname_${userId}`).value,
    designation: document.getElementById(`udesig_${userId}`).value,
    department: document.getElementById(`udept_${userId}`).value,
    section: document.getElementById(`usec_${userId}`).value,
    role: document.getElementById(`urole_${userId}`).value,
    password: document.getElementById(`upass_${userId}`).value
  };

  fetch(API_URL, { method: "POST", body: JSON.stringify(payload) })
    .then(res => res.json())
    .then(data => alert(data.message));
}

function deleteUser(userId) {
  if (confirm("Are you sure to delete this user?")) {
    fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "deleteUser", userId: userId }) })
      .then(res => res.json())
      .then(data => {
        alert(data.message);
        loadManageUsers();
      });
  }
}

function loadViewData() {
  const startDate = document.getElementById('fStartDate').value;
  const endDate = document.getElementById('fEndDate').value;
  const name = document.getElementById('fName').value;
  const dept = document.getElementById('fDept').value;
  const section = document.getElementById('fSec').value;
  const status = document.getElementById('fStatus').value;

  const url = `${API_URL}?action=getViewData&startDate=${startDate}&endDate=${endDate}&name=${encodeURIComponent(name)}&dept=${encodeURIComponent(dept)}&section=${encodeURIComponent(section)}&status=${status}`;

  fetch(url)
    .then(res => res.json())
    .then(resData => {
      viewDataList = resData.data;
      currentPage = 1;
      renderTable();
    });
}

function renderTable() {
  const tbody = document.getElementById('attendanceTableBody');
  tbody.innerHTML = "";

  const startIdx = (currentPage - 1) * rowsPerPage;
  const endIdx = startIdx + rowsPerPage;
  const pageItems = viewDataList.slice(startIdx, endIdx);

  pageItems.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row[0]}</td>
      <td>${row[1]}</td>
      <td>${row[2]}</td>
      <td>${row[3]}</td>
      <td>${row[4]}</td>
      <td>${formatBDDateTimeFull(row[5])}</td>
      <td><strong>${row[6]}</strong></td>
      <td>${formatBDDate(row[7])}</td>
      <td>${formatBDTime(row[8])}</td>
      <td>${row[9]}</td>
      <td>${row[10]}</td>
      <td><a href="${row[11]}" target="_blank">View Map</a></td>
    `;
    tbody.appendChild(tr);
  });

  renderPagination();
}

function renderPagination() {
  const pagEl = document.getElementById('pagination');
  pagEl.innerHTML = "";
  const totalPages = Math.ceil(viewDataList.length / rowsPerPage);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.innerText = i;
    if (i === currentPage) btn.classList.add('active');
    btn.onclick = () => { currentPage = i; renderTable(); };
    pagEl.appendChild(btn);
  }
}

function exportToExcel() {
  if (viewDataList.length === 0) {
    alert("No data available to export!");
    return;
  }
  const headers = ["ID", "Name", "Designation", "Department", "Section", "Submitted Date & Time", "Status", "Punch Date", "Punch Time", "User Location", "Map Location", "Map Link"];
  const exportData = [headers, ...viewDataList];
  const ws = XLSX.utils.aoa_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
  XLSX.writeFile(wb, "Attendance_Report.xlsx");
}