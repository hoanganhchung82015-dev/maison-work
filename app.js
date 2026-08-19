// ==========================================
// CẤU HÌNH SUPABASE & BIẾN TOÀN CỤC
// ==========================================
const SUPABASE_URL = 'https://lkvyigctxkxiwfmdijrx.supabase.co'; // Thay bằng URL Supabase của thầy
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrdnlpZ2N0eGt4aXdmbWRpanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMTQ1NzgsImV4cCI6MjEwMjY5MDU3OH0.OAgFnwrZQwVfA2KNZL-xXFLO6VGisnx7DS0wkyRah7A';                        // Thay bằng Anon Key Supabase của thầy
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let allUsersList = [];

// ==========================================
// HÀM TẠO MÃ CÔNG VIỆC CHUẨN: CV-DDMMYYYY-HHMM
// ==========================================
function generateTaskCode() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    return `CV-${day}${month}${year}-${hours}${minutes}`;
}

// ==========================================
// LOGIC ĐĂNG NHẬP & PHÂN QUYỀN
// ==========================================
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value.trim();

    const { data, error } = await _supabase
        .from('users')
        .select('*')
        .ilike('email', email);

    if (error || !data || data.length === 0) {
        alert('❌ Email hoặc Mật khẩu không chính xác!');
        return;
    }

    const user = data[0];

    if (String(user.password).trim() !== password) {
        alert('❌ Mật khẩu không chính xác!');
        return;
    }

    currentUser = user;
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('mainSection').classList.remove('hidden');

    document.getElementById('userInfoDisplay').innerText = 
        `Cán bộ: ${currentUser.full_name || 'Chưa đặt tên'} | Chức vụ: ${currentUser.role}`;

    const adminUserPanel = document.getElementById('adminUserPanel');
    const createTaskPanel = document.getElementById('createTaskPanel');
    const taskListPanel = document.getElementById('taskListPanel');

    if (currentUser.role === 'HIEU_TRUONG') {
        adminUserPanel?.classList.remove('hidden');
        createTaskPanel?.classList.remove('hidden');
        taskListPanel?.classList.replace('lg:col-span-3', 'lg:col-span-2');
        loadUserManagement();
    } else if (currentUser.role === 'PHO_HIEU_TRUONG') {
        adminUserPanel?.classList.add('hidden');
        createTaskPanel?.classList.remove('hidden');
        taskListPanel?.classList.replace('lg:col-span-3', 'lg:col-span-2');
    } else {
        adminUserPanel?.classList.add('hidden');
        createTaskPanel?.classList.add('hidden');
        taskListPanel?.classList.replace('lg:col-span-2', 'lg:col-span-3');
    }

    await loadAllUsersSelect();
    loadTasks();
}

function handleLogout() {
    currentUser = null;
    location.reload();
}

// ==========================================
// QUẢN LÝ TÀI KHOẢN (HIỆU TRƯỞNG & XÓA TÀI KHOẢN)
// ==========================================
async function handleCreateUser(e) {
    e.preventDefault();
    const full_name = document.getElementById('newFullName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim().toLowerCase();
    const password = document.getElementById('newUserPassword').value.trim();
    const role = document.getElementById('newUserRole').value;

    const { error } = await _supabase.from('users').insert([{ full_name, email, password, role }]);

    if (error) {
        alert('❌ Lỗi tạo tài khoản: ' + error.message);
    } else {
        alert('✅ Đã tạo tài khoản thành công!');
        document.querySelector('#adminUserPanel form').reset();
        document.getElementById('newUserPassword').value = '123456';
        loadUserManagement();
        loadAllUsersSelect();
    }
}

async function loadUserManagement() {
    const { data } = await _supabase.from('users').select('*').order('id', { ascending: true });
    const tbody = document.getElementById('userListTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    data.forEach(u => {
        // Nút xóa tài khoản (Không hiển thị nút xóa cho chính tài khoản đang đăng nhập)
        let deleteBtn = '';
        if (u.id !== currentUser.id) {
            deleteBtn = `<button onclick="deleteUser(${u.id}, '${u.full_name || u.email}')" class="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-2 py-1 rounded text-[11px] transition">🗑️ Xóa</button>`;
        } else {
            deleteBtn = `<span class="text-[10px] text-gray-400 italic">(Đang dùng)</span>`;
        }

        tbody.innerHTML += `
            <tr class="border-b">
                <td class="p-2">${u.id}</td>
                <td class="p-2 font-bold">${u.full_name || 'Chưa đặt tên'}</td>
                <td class="p-2">${u.email}</td>
                <td class="p-2">${u.role}</td>
                <td class="p-2 text-center">${deleteBtn}</td>
            </tr>
        `;
    });
}

// Hàm thực thi xóa tài khoản
async function deleteUser(id, name) {
    const confirmDelete = confirm(`⚠️ Thầy/Cô có chắc chắn muốn xóa tài khoản: "${name}" không?\nHành động này không thể hoàn tác!`);
    
    if (!confirmDelete) return;

    const { error } = await _supabase.from('users').delete().eq('id', id);

    if (error) {
        alert('❌ Không thể xóa tài khoản này! Lỗi: ' + error.message);
    } else {
        alert('✅ Đã xóa tài khoản thành công!');
        loadUserManagement();
        loadAllUsersSelect();
    }
}

// ==========================================
// GIAO VIỆC & ĐÍNH KÈM VĂN BẢN (MÃ CV THEO GIỜ)
// ==========================================
async function loadAllUsersSelect() {
    const { data } = await _supabase.from('users').select('*');
    allUsersList = data || [];

    const select = document.getElementById('assignee_ids');
    if (!select) return;

    select.innerHTML = '';
    allUsersList.forEach(u => {
        if (u.id !== currentUser.id) {
            select.innerHTML += `<option value="${u.id}">[${u.role}] ${u.full_name || u.email}</option>`;
        }
    });
}

async function handleCreateTask(e) {
    e.preventDefault();
    const title = document.getElementById('title').value;
    const output_req = document.getElementById('output_req').value;
    const task_file_url = document.getElementById('task_file_url').value.trim();
    const due_date = document.getElementById('due_date').value;

    const select = document.getElementById('assignee_ids');
    const selectedAssignees = Array.from(select.selectedOptions).map(opt => parseInt(opt.value));

    if (selectedAssignees.length === 0) {
        alert('⚠️ Vui lòng chọn ít nhất 1 người thực hiện!');
        return;
    }

    const taskCode = generateTaskCode();

    const { error } = await _supabase.from('work_items').insert([{
        code: taskCode,
        title,
        output_requirements: output_req,
        task_file_url: task_file_url || null,
        created_by: currentUser.id,
        assignee_ids: selectedAssignees,
        due_date,
        status: 'MOI_TAO'
    }]);

    if (!error) {
        alert(`🚀 Đã phát hành công việc mã: ${taskCode}`);
        document.querySelector('#createTaskPanel form').reset();
        loadTasks();
    } else {
        alert('❌ Lỗi giao việc: ' + error.message);
    }
}

// ==========================================
// XEM TIẾN ĐỘ & TẢI FILE / SẢN PHẨM BÁO CÁO
// ==========================================
async function loadTasks() {
    const { data, error } = await _supabase.from('work_items').select('*').order('created_at', { ascending: false });
    if (error) return;

    const tbody = document.getElementById('taskList');
    if (!tbody) return;
    tbody.innerHTML = '';

    data.forEach(task => {
        const isAssigned = task.assignee_ids && task.assignee_ids.includes(currentUser.id);
        const isCreator = task.created_by === currentUser.id;

        if (currentUser.role !== 'HIEU_TRUONG' && !isAssigned && !isCreator) {
            return;
        }

        let statusBadge = '<span class="badge badge-new">Mới giao</span>';
        if (task.status === 'DA_TIEP_NHAN') statusBadge = '<span class="badge badge-working">Đang thực hiện</span>';
        if (task.status === 'CHO_DUYET') statusBadge = '<span class="badge badge-pending">Chờ nghiệm thu</span>';
        if (task.status === 'HOAN_THANH') statusBadge = '<span class="badge badge-done">✓ Hoàn thành</span>';

        let actionBtn = '';

        if (isCreator || currentUser.role === 'HIEU_TRUONG') {
            if (task.status === 'CHO_DUYET') {
                actionBtn = `<button onclick="approveTask(${task.id})" class="bg-green-600 hover:bg-green-700 text-white font-bold px-2 py-1 rounded text-xs">Nghiệm thu</button>`;
            } else {
                actionBtn = `<span class="text-xs text-gray-400">Theo dõi</span>`;
            }
        }
        
        if (isAssigned) {
            if (task.status === 'MOI_TAO') {
                actionBtn = `<button onclick="acceptTask(${task.id})" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-1 rounded text-xs">1. Tiếp nhận</button>`;
            } else if (task.status === 'DA_TIEP_NHAN') {
                actionBtn = `<button onclick="openSubmitModal(${task.id})" class="bg-purple-600 hover:bg-purple-700 text-white font-bold px-2 py-1 rounded text-xs">2. Báo cáo & Nộp file</button>`;
            }
        }

        tbody.innerHTML += `
            <tr class="border-b">
                <td class="p-3 font-bold text-blue-900 whitespace-nowrap">${task.code}</td>
                <td class="p-3">
                    <div class="font-bold text-gray-800">${task.title}</div>
                    <div class="text-xs text-gray-500 mb-1">Yêu cầu: ${task.output_requirements}</div>
                    ${task.task_file_url 
                        ? `<a href="${task.task_file_url}" target="_blank" class="text-xs text-blue-700 hover:underline font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">📄 Văn bản / Tài liệu đính kèm</a>` 
                        : ''}
                </td>
                <td class="p-3 whitespace-nowrap">${statusBadge}</td>
                <td class="p-3">
                    ${task.document_url 
                        ? `<div>
                            <a href="${task.document_url}" target="_blank" class="text-purple-700 hover:underline text-xs font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200 inline-block mb-1">📎 Sản phẩm / Báo cáo đính kèm</a>
                            ${task.feedback_note ? `<div class="text-[11px] text-gray-600 italic">💬 Note: ${task.feedback_note}</div>` : ''}
                           </div>` 
                        : `<span class="text-xs text-gray-400">Chưa nộp</span>`}
                </td>
                <td class="p-3 text-center whitespace-nowrap">${actionBtn}</td>
            </tr>
        `;
    });
}

// ==========================================
// THAO TÁC CẬP NHẬT TRẠNG THÁI & ĐỔI MẬT KHẨU
// ==========================================
async function acceptTask(id) {
    await _supabase.from('work_items').update({ status: 'DA_TIEP_NHAN' }).eq('id', id);
    loadTasks();
}

function openSubmitModal(id) {
    document.getElementById('modalTaskId').value = id;
    document.getElementById('submitModal').classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

async function confirmSubmitTask() {
    const id = document.getElementById('modalTaskId').value;
    const note = document.getElementById('submitNote').value.trim();
    const url = document.getElementById('submitUrl').value.trim();

    await _supabase.from('work_items').update({
        status: 'CHO_DUYET',
        feedback_note: note,
        document_url: url
    }).eq('id', id);

    closeModal('submitModal');
    loadTasks();
}

async function approveTask(id) {
    await _supabase.from('work_items').update({ status: 'HOAN_THANH' }).eq('id', id);
    loadTasks();
}

function openChangePasswordModal() {
    document.getElementById('changePasswordModal').classList.remove('hidden');
}

async function confirmChangePassword() {
    const newPassword = document.getElementById('newPersonalPassword').value.trim();
    if (!newPassword) return;

    const { error } = await _supabase.from('users').update({ password: newPassword }).eq('id', currentUser.id);

    if (!error) {
        alert('🎉 Đổi mật khẩu thành công!');
        closeModal('changePasswordModal');
    }
}

let currentUser = null;
let allUsersList = [];

// ==========================================
// 2. LOGIC ĐĂNG NHẬP & PHÂN QUYỀN VAI TRÒ
// ==========================================
async function handleLogin(e) {
    e.preventDefault();
    
    // Chuẩn hóa dữ liệu đầu vào (loại bỏ khoảng trắng, hạ chữ thường email)
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value.trim();

    console.log("Đang thử đăng nhập với email:", email);

    // Truy vấn dữ liệu từ bảng users (dùng ilike để không phân biệt chữ hoa/thường)
    const { data, error } = await _supabase
        .from('users')
        .select('*')
        .ilike('email', email);

    if (error) {
        console.error("Lỗi truy vấn Supabase:", error);
        alert('❌ Lỗi kết nối CSDL: ' + error.message);
        return;
    }

    if (!data || data.length === 0) {
        alert('❌ Không tìm thấy tài khoản với email này!');
        return;
    }

    const user = data[0];

    // Kiểm tra mật khẩu
    if (String(user.password).trim() !== password) {
        alert('❌ Mật khẩu không chính xác!');
        return;
    }

    // Lưu thông tin người dùng hiện tại
    currentUser = user;
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('mainSection').classList.remove('hidden');

    document.getElementById('userInfoDisplay').innerText = 
        `Cán bộ: ${currentUser.full_name || 'Chưa cập nhật'} | Chức vụ: ${currentUser.role}`;

    // Phân quyền hiển thị giao diện theo chức vụ
    const adminUserPanel = document.getElementById('adminUserPanel');
    const createTaskPanel = document.getElementById('createTaskPanel');
    const taskListPanel = document.getElementById('taskListPanel');

    if (currentUser.role === 'HIEU_TRUONG') {
        // Hiệu trưởng: Có quyền Quản trị tài khoản & Giao việc
        adminUserPanel?.classList.remove('hidden');
        createTaskPanel?.classList.remove('hidden');
        taskListPanel?.classList.replace('lg:col-span-3', 'lg:col-span-2');
        loadUserManagement();
    } else if (currentUser.role === 'PHO_HIEU_TRUONG') {
        // Phó Hiệu trưởng: Có quyền Giao việc & Báo cáo hoàn thành
        adminUserPanel?.classList.add('hidden');
        createTaskPanel?.classList.remove('hidden');
        taskListPanel?.classList.replace('lg:col-span-3', 'lg:col-span-2');
    } else {
        // Giáo viên: Xem công việc, tiếp nhận và nộp báo cáo
        adminUserPanel?.classList.add('hidden');
        createTaskPanel?.classList.add('hidden');
        taskListPanel?.classList.replace('lg:col-span-2', 'lg:col-span-3');
    }

    await loadAllUsersSelect();
    loadTasks();
}

function handleLogout() {
    currentUser = null;
    location.reload();
}

// ==========================================
// 3. QUẢN LÝ TÀI KHOẢN (QUYỀN HIỆU TRƯỞNG)
// ==========================================
async function handleCreateUser(e) {
    e.preventDefault();
    const full_name = document.getElementById('newFullName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim().toLowerCase();
    const password = document.getElementById('newUserPassword').value.trim();
    const role = document.getElementById('newUserRole').value;

    const { error } = await _supabase.from('users').insert([{ full_name, email, password, role }]);

    if (error) {
        alert('❌ Lỗi tạo tài khoản: ' + error.message);
    } else {
        alert('✅ Đã tạo tài khoản thành công!');
        document.querySelector('#adminUserPanel form').reset();
        document.getElementById('newUserPassword').value = '123456';
        loadUserManagement();
        loadAllUsersSelect();
    }
}

async function loadUserManagement() {
    const { data, error } = await _supabase.from('users').select('*').order('id', { ascending: true });
    if (error) return;

    const tbody = document.getElementById('userListTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    data.forEach(u => {
        tbody.innerHTML += `
            <tr>
                <td class="p-2">${u.id}</td>
                <td class="p-2 font-bold">${u.full_name || 'Chưa đặt tên'}</td>
                <td class="p-2">${u.email}</td>
                <td class="p-2">${u.role}</td>
            </tr>
        `;
    });
}

// ==========================================
// 4. QUẢN LÝ & GIAO CÔNG VIỆC (NHIỀU NGƯỜI)
// ==========================================
async function loadAllUsersSelect() {
    const { data } = await _supabase.from('users').select('*');
    allUsersList = data || [];

    const select = document.getElementById('assignee_ids');
    if (!select) return;

    select.innerHTML = '';
    allUsersList.forEach(u => {
        if (u.id !== currentUser.id) {
            select.innerHTML += `<option value="${u.id}">[${u.role}] ${u.full_name || u.email}</option>`;
        }
    });
}

async function handleCreateTask(e) {
    e.preventDefault();
    const title = document.getElementById('title').value;
    const output_req = document.getElementById('output_req').value;
    const due_date = document.getElementById('due_date').value;

    const select = document.getElementById('assignee_ids');
    const selectedAssignees = Array.from(select.selectedOptions).map(opt => parseInt(opt.value));

    if (selectedAssignees.length === 0) {
        alert('⚠️ Vui lòng chọn ít nhất 1 người thực hiện!');
        return;
    }

    const { error } = await _supabase.from('work_items').insert([{
        code: 'CV-' + Math.floor(1000 + Math.random() * 9000),
        title,
        output_requirements: output_req,
        created_by: currentUser.id,
        assignee_ids: selectedAssignees,
        due_date,
        status: 'MOI_TAO'
    }]);

    if (!error) {
        alert('🚀 Đã phát hành công việc thành công!');
        document.querySelector('#createTaskPanel form').reset();
        loadTasks();
    } else {
        alert('❌ Lỗi giao việc: ' + error.message);
    }
}

// ==========================================
// 5. THEO DÕI & BÁO CÁO TIẾN ĐỘ CONG VIỆC
// ==========================================
async function loadTasks() {
    const { data, error } = await _supabase.from('work_items').select('*').order('created_at', { ascending: false });
    if (error) return;

    const tbody = document.getElementById('taskList');
    if (!tbody) return;
    tbody.innerHTML = '';

    data.forEach(task => {
        const isAssigned = task.assignee_ids && task.assignee_ids.includes(currentUser.id);
        const isCreator = task.created_by === currentUser.id;

        // Lọc danh sách công việc theo phân quyền
        if (currentUser.role !== 'HIEU_TRUONG' && !isAssigned && !isCreator) {
            return;
        }

        let statusBadge = '<span class="badge badge-new">Mới giao</span>';
        if (task.status === 'DA_TIEP_NHAN') statusBadge = '<span class="badge badge-working">Đang thực hiện</span>';
        if (task.status === 'CHO_DUYET') statusBadge = '<span class="badge badge-pending">Chờ nghiệm thu</span>';
        if (task.status === 'HOAN_THANH') statusBadge = '<span class="badge badge-done">✓ Hoàn thành</span>';

        let actionBtn = '';

        // Hiệu trưởng / Người giao việc nghiệm thu
        if (isCreator || currentUser.role === 'HIEU_TRUONG') {
            if (task.status === 'CHO_DUYET') {
                actionBtn = `<button onclick="approveTask(${task.id})" class="bg-green-600 hover:bg-green-700 text-white font-bold px-2 py-1 rounded text-xs">Nghiệm thu</button>`;
            } else {
                actionBtn = `<span class="text-xs text-gray-400">Theo dõi</span>`;
            }
        }
        
        // Người được giao việc thực hiện
        if (isAssigned) {
            if (task.status === 'MOI_TAO') {
                actionBtn = `<button onclick="acceptTask(${task.id})" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-1 rounded text-xs">1. Tiếp nhận</button>`;
            } else if (task.status === 'DA_TIEP_NHAN') {
                actionBtn = `<button onclick="openSubmitModal(${task.id})" class="bg-purple-600 hover:bg-purple-700 text-white font-bold px-2 py-1 rounded text-xs">2. Báo cáo & Hoàn thành</button>`;
            }
        }

        tbody.innerHTML += `
            <tr class="border-b">
                <td class="p-3 font-bold text-blue-900">${task.code}</td>
                <td class="p-3">
                    <div class="font-bold text-gray-800">${task.title}</div>
                    <div class="text-xs text-gray-500">Yêu cầu: ${task.output_requirements}</div>
                </td>
                <td class="p-3">${statusBadge}</td>
                <td class="p-3">
                    ${task.document_url 
                        ? `<a href="${task.document_url}" target="_blank" class="text-blue-600 underline text-xs font-bold">📎 File minh chứng</a>` 
                        : `<span class="text-xs text-gray-400">Chưa nộp</span>`}
                </td>
                <td class="p-3 text-center">${actionBtn}</td>
            </tr>
        `;
    });
}

// ==========================================
// 6. THAO TÁC CẬP NHẬT TRẠNG THÁI & ĐỔI MẬT KHẨU
// ==========================================
async function acceptTask(id) {
    await _supabase.from('work_items').update({ status: 'DA_TIEP_NHAN' }).eq('id', id);
    loadTasks();
}

function openSubmitModal(id) {
    document.getElementById('modalTaskId').value = id;
    document.getElementById('submitModal').classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

async function confirmSubmitTask() {
    const id = document.getElementById('modalTaskId').value;
    const note = document.getElementById('submitNote').value;
    const url = document.getElementById('submitUrl').value;

    await _supabase.from('work_items').update({
        status: 'CHO_DUYET',
        description: note,
        document_url: url
    }).eq('id', id);

    closeModal('submitModal');
    loadTasks();
}

async function approveTask(id) {
    await _supabase.from('work_items').update({ status: 'HOAN_THANH' }).eq('id', id);
    loadTasks();
}

function openChangePasswordModal() {
    document.getElementById('changePasswordModal').classList.remove('hidden');
}

async function confirmChangePassword() {
    const newPassword = document.getElementById('newPersonalPassword').value.trim();
    if (!newPassword) {
        alert('⚠️ Vui lòng nhập mật khẩu mới!');
        return;
    }

    const { error } = await _supabase.from('users').update({ password: newPassword }).eq('id', currentUser.id);

    if (!error) {
        alert('🎉 Đổi mật khẩu thành công!');
        closeModal('changePasswordModal');
    } else {
        alert('❌ Lỗi đổi mật khẩu: ' + error.message);
    }
}
