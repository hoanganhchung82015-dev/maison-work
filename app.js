const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_KEY';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let allUsersList = [];

// 1. ĐĂNG NHẬP KIỂM TRA MẬT KHẨU
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    const { data, error } = await _supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (error || !data || data.password !== password) {
        alert('❌ Email hoặc Mật khẩu không chính xác!');
        return;
    }

    currentUser = data;
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('mainSection').classList.remove('hidden');

    document.getElementById('userInfoDisplay').innerText = 
        `Cán bộ: ${currentUser.full_name} | Chức vụ: ${currentUser.role}`;

    // PHÂN QUYỀN CHỨC NĂNG VÀ MÀN HÌNH
    const adminUserPanel = document.getElementById('adminUserPanel');
    const createTaskPanel = document.getElementById('createTaskPanel');
    const taskListPanel = document.getElementById('taskListPanel');

    // Hiệu trưởng: Quản lý tài khoản + Giao việc
    if (currentUser.role === 'HIEU_TRUONG') {
        adminUserPanel.classList.remove('hidden');
        createTaskPanel.classList.remove('hidden');
        taskListPanel.classList.replace('lg:col-span-3', 'lg:col-span-2');
        loadUserManagement();
    } 
    // Phó Hiệu trưởng: Điều hành (Giao việc) & Báo cáo xử lý việc
    else if (currentUser.role === 'PHO_HIEU_TRUONG') {
        adminUserPanel.classList.add('hidden');
        createTaskPanel.classList.remove('hidden');
        taskListPanel.classList.replace('lg:col-span-3', 'lg:col-span-2');
    } 
    // Giáo viên: Xử lý & hoàn thành việc
    else {
        adminUserPanel.classList.add('hidden');
        createTaskPanel.classList.add('hidden');
        taskListPanel.classList.replace('lg:col-span-2', 'lg:col-span-3');
    }

    await loadAllUsersSelect();
    loadTasks();
}

function handleLogout() {
    currentUser = null;
    location.reload();
}

// 2. NẠP DANH SÁCH TÀI KHOẢN VÀO KHUNG GIAO VIỆC (CHỌN NHIỀU NGƯỜI)
async function loadAllUsersSelect() {
    const { data } = await _supabase.from('users').select('*');
    allUsersList = data || [];

    const select = document.getElementById('assignee_ids');
    select.innerHTML = '';
    
    allUsersList.forEach(u => {
        if (u.id !== currentUser.id) {
            select.innerHTML += `<option value="${u.id}">[${u.role}] ${u.full_name}</option>`;
        }
    });
}

// 3. HIỆU TRƯỞNG TẠO VÀ QUẢN LÝ TÀI KHOẢN
async function handleCreateUser(e) {
    e.preventDefault();
    const full_name = document.getElementById('newFullName').value;
    const email = document.getElementById('newUserEmail').value;
    const password = document.getElementById('newUserPassword').value;
    const role = document.getElementById('newUserRole').value;

    const { error } = await _supabase.from('users').insert([{ full_name, email, password, role }]);

    if (error) {
        alert('Lỗi tạo tài khoản: ' + error.message);
    } else {
        alert('✅ Đã tạo tài khoản thành công!');
        document.querySelector('#adminUserPanel form').reset();
        loadUserManagement();
        loadAllUsersSelect();
    }
}

async function loadUserManagement() {
    const { data } = await _supabase.from('users').select('*').order('id', { ascending: true });
    const tbody = document.getElementById('userListTable');
    tbody.innerHTML = '';
    data.forEach(u => {
        tbody.innerHTML += `
            <tr>
                <td class="p-2">${u.id}</td>
                <td class="p-2 font-bold">${u.full_name}</td>
                <td class="p-2">${u.email}</td>
                <td class="p-2">${u.role}</td>
            </tr>
        `;
    });
}

// 4. HIỆU TRƯỞNG / PHT GIAO VIỆC CHO NHIỀU NGƯỜI
async function handleCreateTask(e) {
    e.preventDefault();
    const title = document.getElementById('title').value;
    const output_req = document.getElementById('output_req').value;
    const due_date = document.getElementById('due_date').value;

    const select = document.getElementById('assignee_ids');
    const selectedAssignees = Array.from(select.selectedOptions).map(opt => parseInt(opt.value));

    if (selectedAssignees.length === 0) {
        alert('Vui lòng chọn ít nhất 1 người thực hiện!');
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
    }
}

// 5. TẢI VÀ XỬ LÝ DỮ LIỆU CÔNG VIỆC THEO QUYỀN
async function loadTasks() {
    const { data, error } = await _supabase.from('work_items').select('*').order('created_at', { ascending: false });
    if (error) return;

    const tbody = document.getElementById('taskList');
    tbody.innerHTML = '';

    data.forEach(task => {
        // Kiểm tra xem user hiện tại có thuộc danh sách được giao việc không
        const isAssigned = task.assignee_ids && task.assignee_ids.includes(currentUser.id);
        const isCreator = task.created_by === currentUser.id;

        // Bỏ qua nếu Giáo viên/PHT xem công việc không liên quan đến mình
        if (currentUser.role !== 'HIEU_TRUONG' && !isAssigned && !isCreator) {
            return;
        }

        let statusBadge = '<span class="badge badge-new">Mới giao</span>';
        if (task.status === 'DA_TIEP_NHAN') statusBadge = '<span class="badge badge-working">Đang thực hiện</span>';
        if (task.status === 'CHO_DUYET') statusBadge = '<span class="badge badge-pending">Chờ nghiệm thu</span>';
        if (task.status === 'HOAN_THANH') statusBadge = '<span class="badge badge-done">✓ Hoàn thành</span>';

        let actionBtn = '';

        // Hiệu trưởng / PHT (Người giao việc) Nghiệm thu
        if (isCreator || currentUser.role === 'HIEU_TRUONG') {
            if (task.status === 'CHO_DUYET') {
                actionBtn = `<button onclick="approveTask(${task.id})" class="bg-green-600 hover:bg-green-700 text-white font-bold px-2 py-1 rounded text-xs">Nghiệm thu</button>`;
            } else {
                actionBtn = `<span class="text-xs text-gray-400">Theo dõi</span>`;
            }
        }
        
        // PHT / Giáo viên (Người thực hiện) Xử lý & Hoàn thành việc
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

// 6. THAO TÁC XỬ LÝ TRẠNG THÁI & ĐỔI MẬT KHẨU
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
    const newPassword = document.getElementById('newPersonalPassword').value;
    if (!newPassword) return;

    const { error } = await _supabase.from('users').update({ password: newPassword }).eq('id', currentUser.id);

    if (!error) {
        alert('🎉 Đổi mật khẩu thành công!');
        closeModal('changePasswordModal');
    }
}
