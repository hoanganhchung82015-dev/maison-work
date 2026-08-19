// LocalStorage Key Identifiers
const STORAGE_USERS = 'MSW_USERS_V1_5';
const STORAGE_TASKS = 'MSW_TASKS_V1_5';

// Khởi tạo dữ liệu mẫu
function initDefaultData() {
  if (!localStorage.getItem(STORAGE_USERS)) {
    const defaultUsers = [
      { username: 'hieutruong', fullname: 'Hiệu trưởng', role: 'PRINCIPAL', pass: '123456' },
      { username: 'hieupho1', fullname: 'Nguyễn Văn A (HP)', role: 'VICE_PRINCIPAL', pass: '123456' },
      { username: 'gv_toan', fullname: 'Trần Thị B (GV Toán)', role: 'TEACHER', pass: '123456' },
      { username: 'gv_van', fullname: 'Lê Văn C (GV Văn)', role: 'TEACHER', pass: '123456' }
    ];
    localStorage.setItem(STORAGE_USERS, JSON.stringify(defaultUsers));
  }

  if (!localStorage.getItem(STORAGE_TASKS)) {
    const defaultTasks = [
      {
        id: 'CV-19082026-0211',
        title: 'Báo cáo kế hoạch giảng dạy Học kỳ 1',
        created_by: 'Hiệu trưởng',
        assignees: ['Nguyễn Văn A (HP)', 'Trần Thị B (GV Toán)'],
        deadline: '2026-08-25',
        instruction_file: null,
        report_file: null,
        status: 'Đang xử lý',
        note: 'Yêu cầu hoàn thành đúng hạn'
      }
    ];
    localStorage.setItem(STORAGE_TASKS, JSON.stringify(defaultTasks));
  }
}

initDefaultData();

let currentUser = null;

// Helper: Chuyển File sang Base64 để lưu vào localStorage
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve({ name: file.name, data: reader.result });
    reader.onerror = error => reject(error);
  });
}

// Helper: Sinh Mã Công việc chuẩn CV-DDMMYYYY-HHMM (Hệ 24 giờ)
function generateTaskId() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `CV-${day}${month}${year}-${hours}${minutes}`;
}

// Handle Login
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');

document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const uName = document.getElementById('login-username').value.trim();
  const uPass = document.getElementById('login-password').value.trim();

  const users = JSON.parse(localStorage.getItem(STORAGE_USERS));
  const user = users.find(u => u.username === uName && u.pass === uPass);

  if (user) {
    currentUser = user;
    renderApp();
  } else {
    alert('Tài khoản hoặc mật khẩu không chính xác!');
  }
});

document.getElementById('btn-logout').addEventListener('click', () => {
  currentUser = null;
  appScreen.classList.add('hidden');
  loginScreen.classList.remove('hidden');
});

// Giao diện chính theo Role
function renderApp() {
  loginScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');

  document.getElementById('user-info').innerText = currentUser.fullname;
  const badge = document.getElementById('user-badge');

  if (currentUser.role === 'PRINCIPAL') badge.innerText = 'Hiệu trưởng (Admin)';
  else if (currentUser.role === 'VICE_PRINCIPAL') badge.innerText = 'Hiệu phó';
  else badge.innerText = 'Giáo viên';

  const menuAssign = document.getElementById('menu-assign');
  const menuUsers = document.getElementById('menu-users');

  if (currentUser.role === 'PRINCIPAL') {
    menuAssign.classList.remove('hidden');
    menuUsers.classList.remove('hidden');
  } else if (currentUser.role === 'VICE_PRINCIPAL') {
    menuAssign.classList.remove('hidden');
    menuUsers.classList.add('hidden');
  } else {
    menuAssign.classList.add('hidden');
    menuUsers.classList.add('hidden');
  }

  loadTasks();
  loadAssigneeCheckboxes();
  if (currentUser.role === 'PRINCIPAL') loadUserList();
}

// Navigation Tabs
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));

    link.classList.add('active');
    const tabId = link.getAttribute('data-tab');
    document.getElementById(tabId).classList.remove('hidden');
  });
});

// Load Danh sách Công việc
function loadTasks() {
  const tasks = JSON.parse(localStorage.getItem(STORAGE_TASKS)) || [];
  const tbody = document.getElementById('task-list-body');
  tbody.innerHTML = '';

  tasks.forEach(task => {
    const isAssignee = task.assignees.includes(currentUser.fullname);
    const isCreator = task.created_by === currentUser.fullname;
    const isMaster = currentUser.role === 'PRINCIPAL';

    if (isAssignee || isCreator || isMaster) {
      const tr = document.createElement('tr');

      // Link download văn bản chỉ đạo
      const instFileHtml = task.instruction_file 
        ? `<a href="${task.instruction_file.data}" download="${task.instruction_file.name}" class="file-link">📄 ${task.instruction_file.name}</a>` 
        : '<span style="color:#aaa;">Không có</span>';

      // Link download file báo cáo
      const reportFileHtml = task.report_file 
        ? `<a href="${task.report_file.data}" download="${task.report_file.name}" class="file-link">📎 ${task.report_file.name}</a>` 
        : '<span style="color:#aaa;">Chưa nộp</span>';

      tr.innerHTML = `
        <td><b>${task.id}</b></td>
        <td>${task.title}</td>
        <td>${task.created_by}</td>
        <td>${task.assignees.join(', ')}</td>
        <td>${task.deadline}</td>
        <td>${instFileHtml}</td>
        <td>${reportFileHtml}</td>
        <td><span class="badge">${task.status}</span></td>
        <td>
          ${isAssignee && task.status !== 'Hoàn thành' ? `<button class="btn btn-success btn-sm" onclick="openReportModal('${task.id}')">Báo cáo hoàn thành</button>` : ''}
          ${(isCreator || isMaster) && task.status === 'Chờ duyệt' ? `<button class="btn btn-primary btn-sm" onclick="approveTask('${task.id}')">Duyệt hoàn thành</button>` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    }
  });
}

// Multi-select danh sách giao việc
function loadAssigneeCheckboxes() {
  const users = JSON.parse(localStorage.getItem(STORAGE_USERS)) || [];
  const container = document.getElementById('assignee-checkbox-group');
  container.innerHTML = '';

  users.forEach(u => {
    if (u.username !== currentUser.username) {
      const label = document.createElement('label');
      label.className = 'checkbox-item';
      label.innerHTML = `<input type="checkbox" name="assignees" value="${u.fullname}"> ${u.fullname} (${u.role})`;
      container.appendChild(label);
    }
  });
}

// Xử lý Giao việc Mới
document.getElementById('assign-task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('task-title').value.trim();
  const deadline = document.getElementById('task-deadline').value;
  const note = document.getElementById('task-note').value;
  const fileInput = document.getElementById('task-instruction-file');

  const selectedAssignees = Array.from(document.querySelectorAll('input[name="assignees"]:checked'))
                                 .map(cb => cb.value);

  if (selectedAssignees.length === 0) {
    alert('Vui lòng chọn ít nhất một người thực hiện!');
    return;
  }

  let instructionFile = null;
  if (fileInput.files.length > 0) {
    instructionFile = await fileToBase64(fileInput.files[0]);
  }

  const tasks = JSON.parse(localStorage.getItem(STORAGE_TASKS)) || [];
  const taskId = generateTaskId();

  const newTask = {
    id: taskId,
    title,
    created_by: currentUser.fullname,
    assignees: selectedAssignees,
    deadline,
    instruction_file: instructionFile,
    report_file: null,
    status: 'Đang xử lý',
    note
  };

  tasks.push(newTask);
  localStorage.setItem(STORAGE_TASKS, JSON.stringify(tasks));
  alert(`Giao việc thành công! Mã CV: ${taskId}`);
  document.getElementById('assign-task-form').reset();
  loadTasks();
});

// Modal Báo cáo Hoàn thành
const reportModal = document.getElementById('modal-report-task');
document.querySelector('.close-modal-report').onclick = () => reportModal.classList.add('hidden');

window.openReportModal = function(taskId) {
  document.getElementById('report-task-id').value = taskId;
  reportModal.classList.remove('hidden');
};

document.getElementById('report-task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const taskId = document.getElementById('report-task-id').value;
  const fileInput = document.getElementById('task-report-file');

  if (fileInput.files.length === 0) {
    alert('Vui lòng đính kèm sản phẩm/báo cáo!');
    return;
  }

  const reportFile = await fileToBase64(fileInput.files[0]);
  const tasks = JSON.parse(localStorage.getItem(STORAGE_TASKS));
  const task = tasks.find(t => t.id === taskId);

  if (task) {
    task.report_file = reportFile;
    task.status = 'Chờ duyệt';
    localStorage.setItem(STORAGE_TASKS, JSON.stringify(tasks));
    alert('Đã gửi báo cáo thành công!');
    reportModal.classList.add('hidden');
    document.getElementById('report-task-form').reset();
    loadTasks();
  }
});

// Duyệt công việc
window.approveTask = function(taskId) {
  const tasks = JSON.parse(localStorage.getItem(STORAGE_TASKS));
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    task.status = 'Hoàn thành';
    localStorage.setItem(STORAGE_TASKS, JSON.stringify(tasks));
    loadTasks();
  }
};

// Admin: Quản lý & Xóa Tài khoản
function loadUserList() {
  const users = JSON.parse(localStorage.getItem(STORAGE_USERS)) || [];
  const tbody = document.getElementById('user-list-body');
  tbody.innerHTML = '';

  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.username}</td>
      <td>${u.fullname}</td>
      <td>${u.role}</td>
      <td>
        ${u.username !== currentUser.username ? `<button class="btn btn-danger btn-sm" onclick="deleteUser('${u.username}')">Xóa tài khoản</button>` : '<span style="color:gray;">Tài khoản hiện tại</span>'}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('create-user-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('new-username').value.trim();
  const fullname = document.getElementById('new-fullname').value.trim();
  const role = document.getElementById('new-role').value;
  const pass = document.getElementById('new-password').value.trim();

  const users = JSON.parse(localStorage.getItem(STORAGE_USERS));
  if (users.some(u => u.username === username)) {
    alert('Tên đăng nhập đã tồn tại!');
    return;
  }

  users.push({ username, fullname, role, pass });
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
  alert('Tạo tài khoản thành công!');
  document.getElementById('create-user-form').reset();
  loadUserList();
  loadAssigneeCheckboxes();
});

// Chức năng XÓA TÀI KHOẢN dành cho Quản lý (Hiệu trưởng)
window.deleteUser = function(uName) {
  if (confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản [${uName}]?`)) {
    let users = JSON.parse(localStorage.getItem(STORAGE_USERS));
    users = users.filter(u => u.username !== uName);
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
    alert('Xóa tài khoản thành công!');
    loadUserList();
    loadAssigneeCheckboxes();
  }
};

// Modal Đổi Mật Khẩu
const passModal = document.getElementById('modal-change-password');
document.getElementById('btn-change-pass').onclick = () => passModal.classList.remove('hidden');
document.querySelector('.close-modal-pass').onclick = () => passModal.classList.add('hidden');

document.getElementById('change-pass-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const oldPass = document.getElementById('old-pass').value;
  const newPass = document.getElementById('new-pass').value;

  if (oldPass !== currentUser.pass) {
    alert('Mật khẩu cũ không chính xác!');
    return;
  }

  const users = JSON.parse(localStorage.getItem(STORAGE_USERS));
  const user = users.find(u => u.username === currentUser.username);
  user.pass = newPass;
  currentUser.pass = newPass;

  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
  alert('Đổi mật khẩu thành công!');
  passModal.classList.add('hidden');
  document.getElementById('change-pass-form').reset();
});
