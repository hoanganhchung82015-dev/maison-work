// 1. CẤU HÌNH KẾT NỐI SUPABASE
const SUPABASE_URL = 'https://lkvyigctxkxiwfmdijrx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrdnlpZ2N0eGt4aXdmbWRpanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMTQ1NzgsImV4cCI6MjEwMjY5MDU3OH0.OAgFnwrZQwVfA2KNZL-xXFLO6VGisnx7DS0wkyRah7A';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Biến lưu thông tin tài khoản đang đăng nhập
let currentUser = null;

// 2. XỬ LÝ ĐĂNG NHẬP & PHÂN QUYỀN
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();

    const { data, error } = await _supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (error || !data) {
        alert('❌ Email không tồn tại trong hệ thống THPT Mai Sơn!');
        return;
    }

    currentUser = data;

    // Ẩn màn hình đăng nhập, hiện màn hình làm việc
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('mainSection').classList.remove('hidden');

    // Hiển thị thông tin người dùng
    document.getElementById('userInfoDisplay').innerText = 
        `Cán bộ: ${currentUser.full_name} | Chức vụ / Vai trò: ${currentUser.role}`;

    // PHÂN QUYỀN GIAO DIỆN VỊ TRÍ WORKSPACE
    const createTaskPanel = document.getElementById('createTaskPanel');
    const taskListPanel = document.getElementById('taskListPanel');

    if (currentUser.role === 'HIEU_TRUONG' || currentUser.role === 'PHO_HIEU_TRUONG') {
        // Nếu là Ban Giám hiệu: Hiện Panel Giao việc
        createTaskPanel.classList.remove('hidden');
        taskListPanel.classList.replace('lg:col-span-3', 'lg:col-span-2');
    } else {
        // Nếu là Giáo viên: Ẩn Panel Giao việc, mở rộng bảng
        createTaskPanel.classList.add('hidden');
        taskListPanel.classList.replace('lg:col-span-2', 'lg:col-span-3');
    }

    loadTasks();
}

function handleLogout() {
    currentUser = null;
    location.reload();
}

// 3. TẢI DANH SÁCH CÔNG VIỆC THEO PHÂN QUYỀN
async function loadTasks() {
    let query = _supabase.from('work_items').select('*').order('created_at', { ascending: false });

    // Nếu không phải Hiệu trưởng, chỉ xem các công việc được giao cho chính mình
    if (currentUser.role !== 'HIEU_TRUONG') {
        query = query.eq('assignee_id', currentUser.id);
    }

    const { data, error } = await query;
    if (error) {
        console.error("Lỗi nạp danh sách công việc:", error);
        return;
    }

    const tbody = document.getElementById('taskList');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-500 italic">Hiện chưa có luồng công việc nào.</td></tr>`;
        return;
    }

    data.forEach(task => {
        // Gắn nhãn trạng thái
        let statusBadge = '<span class="badge badge-new">Mới giao</span>';
        if (task.status === 'DA_TIEP_NHAN') statusBadge = '<span class="badge badge-working">Đang thực hiện</span>';
        if (task.status === 'CHO_DUYET') statusBadge = '<span class="badge badge-pending">Chờ BGH duyệt</span>';
        if (task.status === 'HOAN_THANH') statusBadge = '<span class="badge badge-done">✓ Hoàn thành</span>';

        // Nút thao tác tương ứng theo vai trò & trạng thái
        let actionBtn = '';

        if (currentUser.role === 'HIEU_TRUONG' || currentUser.role === 'PHO_HIEU_TRUONG') {
            if (task.status === 'CHO_DUYET') {
                actionBtn = `<button onclick="approveTask(${task.id})" class="bg-green-600 hover:bg-green-700 text-white font-bold px-2.5 py-1 rounded text-xs shadow">Nghiệm thu</button>`;
            } else if (task.status === 'HOAN_THANH') {
                actionBtn = `<span class="text-xs text-green-700 font-bold">Đã nghiệm thu</span>`;
            } else {
                actionBtn = `<span class="text-xs text-gray-400">Đang theo dõi</span>`;
            }
        } else {
            // Dành cho Giáo viên thực hiện
            if (task.status === 'MOI_TAO') {
                actionBtn = `<button onclick="acceptTask(${task.id})" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded text-xs shadow">1. Bấm Tiếp nhận</button>`;
            } else if (task.status === 'DA_TIEP_NHAN') {
                actionBtn = `<button onclick="openSubmitModal(${task.id})" class="bg-purple-600 hover:bg-purple-700 text-white font-bold px-2.5 py-1 rounded text-xs shadow">2. Trả kết quả</button>`;
            } else {
                actionBtn = `<span class="text-xs text-purple-700 font-semibold">Đã gửi / Chờ duyệt</span>`;
            }
        }

        // Đổ dòng vào bảng
        tbody.innerHTML += `
            <tr class="border-b">
                <td class="p-3 font-bold text-blue-900">${task.code}</td>
                <td class="p-3">
                    <div class="font-bold text-gray-800">${task.title}</div>
                    <div class="text-xs text-gray-500 mt-0.5">Yêu cầu: ${task.output_requirements}</div>
                </td>
                <td class="p-3">${statusBadge}</td>
                <td class="p-3">
                    ${task.document_url 
                        ? `<a href="${task.document_url}" target="_blank" class="text-blue-600 hover:underline text-xs font-bold">📎 Xem file đính kèm</a>` 
                        : `<span class="text-xs text-gray-400">Chưa nộp</span>`}
                </td>
                <td class="p-3 text-center">${actionBtn}</td>
            </tr>
        `;
    });
}

// 4. HÀM HIỆU TRƯỞNG GIAO VIỆC MỚI
async function handleCreateTask(e) {
    e.preventDefault();
    const title = document.getElementById('title').value;
    const output_req = document.getElementById('output_req').value;
    const assignee_id = document.getElementById('assignee_id').value;
    const due_date = document.getElementById('due_date').value;

    const { error } = await _supabase.from('work_items').insert([{
        code: 'CV-' + Math.floor(1000 + Math.random() * 9000),
        title: title,
        output_requirements: output_req,
        created_by: currentUser.id,
        assignee_id: parseInt(assignee_id),
        due_date: due_date,
        status: 'MOI_TAO'
    }]);

    if (error) {
        alert('Lỗi khi giao việc: ' + error.message);
    } else {
        alert('🚀 Phát hành luồng công việc thành công!');
        document.querySelector('#createTaskPanel form').reset();
        loadTasks();
    }
}

// 5. CÁC HÀM XỬ LÝ TIẾP NHẬN & BÁO CÁO KẾT QUẢ
async function acceptTask(id) {
    const { error } = await _supabase.from('work_items').update({ status: 'DA_TIEP_NHAN' }).eq('id', id);
    if (!error) loadTasks();
}

function openSubmitModal(id) {
    document.getElementById('modalTaskId').value = id;
    document.getElementById('submitModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('submitModal').classList.add('hidden');
}

async function confirmSubmitTask() {
    const id = document.getElementById('modalTaskId').value;
    const note = document.getElementById('submitNote').value;
    const url = document.getElementById('submitUrl').value;

    if (!url) {
        alert('Vui lòng dán link file minh chứng!');
        return;
    }

    const { error } = await _supabase.from('work_items').update({
        status: 'CHO_DUYET',
        description: note,
        document_url: url
    }).eq('id', id);

    if (!error) {
        alert('📤 Đã gửi báo cáo kết quả thành công!');
        closeModal();
        loadTasks();
    }
}

async function approveTask(id) {
    const { error } = await _supabase.from('work_items').update({ status: 'HOAN_THANH' }).eq('id', id);
    if (!error) {
        alert('🎉 Đã hoàn tất nghiệm thu công việc!');
        loadTasks();
    }
}
