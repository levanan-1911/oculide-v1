'use client';

import { FormEvent, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  Eye,
  GraduationCap,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRoundCheck,
  Users,
  X,
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';

type ClassStatus = 'Hoạt động' | 'Đã kết thúc';
type StudentStatus = 'Đang học' | 'Tạm dừng';

interface StudentRow {
  id: string;
  name: string;
  email: string;
  status: StudentStatus;
}

interface ClassRow {
  id: string;
  name: string;
  semester: string;
  status: ClassStatus;
  studentCount: number;
  students: StudentRow[];
}

const INITIAL_CLASSES: ClassRow[] = [
  {
    id: 'SE1848',
    name: 'Lập trình Web',
    semester: 'HKT 2026-27',
    status: 'Hoạt động',
    studentCount: 48,
    students: [
      { id: 'SE184801', name: 'Nguyễn Minh Anh', email: 'anh.nm@school.edu.vn', status: 'Đang học' },
      { id: 'SE184802', name: 'Trần Hoàng Long', email: 'long.th@school.edu.vn', status: 'Đang học' },
      { id: 'SE184803', name: 'Lê Thu Hà', email: 'ha.lt@school.edu.vn', status: 'Đang học' },
      { id: 'SE184804', name: 'Phạm Quốc Bảo', email: 'bao.pq@school.edu.vn', status: 'Tạm dừng' },
    ],
  },
  {
    id: 'IT2202',
    name: 'Cấu trúc dữ liệu',
    semester: 'HKT 2026-27',
    status: 'Hoạt động',
    studentCount: 52,
    students: [
      { id: 'IT220201', name: 'Vũ Gia Huy', email: 'huy.vg@school.edu.vn', status: 'Đang học' },
      { id: 'IT220202', name: 'Đỗ Khánh Linh', email: 'linh.dk@school.edu.vn', status: 'Đang học' },
      { id: 'IT220203', name: 'Ngô Đức Nam', email: 'nam.nd@school.edu.vn', status: 'Đang học' },
    ],
  },
  {
    id: 'SE1849',
    name: 'Lập trình hướng đối tượng',
    semester: 'HKT 2026-27',
    status: 'Hoạt động',
    studentCount: 46,
    students: [
      { id: 'SE184901', name: 'Bùi Nhật Minh', email: 'minh.bn@school.edu.vn', status: 'Đang học' },
      { id: 'SE184902', name: 'Hoàng Ngọc Mai', email: 'mai.hn@school.edu.vn', status: 'Đang học' },
    ],
  },
];

const SEMESTERS = ['HKT 2026-27', 'HKT 2025-26'];

export default function ClassManagerPage() {
  const [classes, setClasses] = useState<ClassRow[]>(INITIAL_CLASSES);
  const [selectedClassId, setSelectedClassId] = useState(INITIAL_CLASSES[0].id);
  const [search, setSearch] = useState('');
  const [semester, setSemester] = useState('Tất cả học kỳ');
  const [status, setStatus] = useState('Tất cả trạng thái');
  const [studentSearch, setStudentSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null);
  const [editError, setEditError] = useState('');
  const [deletingClass, setDeletingClass] = useState<ClassRow | null>(null);

  function openEditModal(classItem: ClassRow) {
    setEditError('');
    setEditingClass(classItem);
  }

  function closeEditModal() {
    setEditError('');
    setEditingClass(null);
  }

  function saveEditClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingClass) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const newId = String(formData.get('classId') ?? '').trim().toUpperCase();
    const name = String(formData.get('className') ?? '').trim();
    const classSemester = String(formData.get('semester') ?? '').trim();
    const classStatus = String(formData.get('status') ?? 'Hoạt động') as ClassStatus;

    if (!newId) {
      setEditError('Mã lớp không được để trống.');
      return;
    }
    if (!name) {
      setEditError('Tên lớp không được để trống.');
      return;
    }

    if (
      newId.toLocaleLowerCase('vi') !== editingClass.id.toLocaleLowerCase('vi') &&
      classes.some((item) => item.id.toLocaleLowerCase('vi') === newId.toLocaleLowerCase('vi'))
    ) {
      setEditError('Mã lớp này đã tồn tại. Vui lòng nhập mã khác.');
      return;
    }

    setClasses((current) =>
      current.map((item) =>
        item.id === editingClass.id
          ? {
              ...item,
              id: newId,
              name,
              semester: classSemester,
              status: classStatus,
            }
          : item
      )
    );

    if (selectedClassId === editingClass.id) {
      setSelectedClassId(newId);
    }

    setEditingClass(null);
    setEditError('');
  }

  function openDeleteModal(classItem: ClassRow) {
    setDeletingClass(classItem);
  }

  function closeDeleteModal() {
    setDeletingClass(null);
  }

  function confirmDeleteClass() {
    if (!deletingClass) return;
    const remaining = classes.filter((item) => item.id !== deletingClass.id);
    setClasses(remaining);
    if (selectedClassId === deletingClass.id) {
      setSelectedClassId(remaining.length > 0 ? remaining[0].id : '');
    }
    setDeletingClass(null);
  }

  const filteredClasses = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return classes.filter((classItem) => {
      const matchesSearch =
        !query ||
        classItem.id.toLocaleLowerCase('vi').includes(query) ||
        classItem.name.toLocaleLowerCase('vi').includes(query);
      const matchesSemester = semester === 'Tất cả học kỳ' || classItem.semester === semester;
      const matchesStatus = status === 'Tất cả trạng thái' || classItem.status === status;
      return matchesSearch && matchesSemester && matchesStatus;
    });
  }, [classes, search, semester, status]);

  const selectedClass = classes.find((item) => item.id === selectedClassId) ?? null;
  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLocaleLowerCase('vi');
    if (!selectedClass) return [];
    if (!query) return selectedClass.students;
    return selectedClass.students.filter(
      (student) =>
        student.id.toLocaleLowerCase('vi').includes(query) ||
        student.name.toLocaleLowerCase('vi').includes(query) ||
        student.email.toLocaleLowerCase('vi').includes(query),
    );
  }, [selectedClass, studentSearch]);

  const totalStudents = classes.reduce((sum, item) => sum + item.studentCount, 0);
  const activeClasses = classes.filter((item) => item.status === 'Hoạt động').length;

  function createClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const id = String(formData.get('classId') ?? '').trim().toUpperCase();
    const name = String(formData.get('className') ?? '').trim();
    const classSemester = String(formData.get('semester') ?? '').trim();

    if (classes.some((item) => item.id.toLocaleLowerCase('vi') === id.toLocaleLowerCase('vi'))) {
      setCreateError('Mã lớp này đã tồn tại. Vui lòng nhập mã khác.');
      return;
    }

    const newClass: ClassRow = {
      id,
      name,
      semester: classSemester,
      status: 'Hoạt động',
      studentCount: 0,
      students: [],
    };
    setClasses((current) => [...current, newClass]);
    setSelectedClassId(id);
    setSearch('');
    setSemester('Tất cả học kỳ');
    setStatus('Tất cả trạng thái');
    setStudentSearch('');
    setIsCreateModalOpen(false);
    setCreateError('');
    form.reset();
  }

  function openCreateModal() {
    setCreateError('');
    setIsCreateModalOpen(true);
  }

  function closeCreateModal() {
    setCreateError('');
    setIsCreateModalOpen(false);
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f4f7f9] text-slate-800">
      <AdminSidebar activeModule="classes" />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar title="Quản lý lớp & sinh viên" />

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-[1440px]">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Quản lý đào tạo</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">
                  Lớp học & sinh viên
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Theo dõi lớp học, sĩ số và danh sách sinh viên trên cùng một màn hình.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Tạo lớp mới
              </button>
            </div>

            <section className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Tổng số lớp', value: classes.length, icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
                { label: 'Lớp hoạt động', value: activeClasses, icon: UserRoundCheck, color: 'bg-emerald-50 text-emerald-600' },
                { label: 'Tổng sinh viên', value: totalStudents, icon: GraduationCap, color: 'bg-violet-50 text-violet-600' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.label} className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.color}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-slate-500">{item.label}</p>
                      <p className="mt-0.5 text-2xl font-extrabold text-slate-900">{item.value}</p>
                    </div>
                  </article>
                );
              })}
            </section>

            <section className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/30 sm:p-6">
              <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_220px_220px]">
                <label className="relative block">
                  <span className="sr-only">Tìm lớp</span>
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm theo mã hoặc tên lớp..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <SelectFilter
                  label="Lọc theo học kỳ"
                  value={semester}
                  onChange={setSemester}
                  options={['Tất cả học kỳ', ...SEMESTERS]}
                />
                <SelectFilter
                  label="Lọc theo trạng thái"
                  value={status}
                  onChange={setStatus}
                  options={['Tất cả trạng thái', 'Hoạt động', 'Đã kết thúc']}
                />
              </div>
            </section>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(360px,4fr)]">
              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 className="font-bold text-slate-900">Danh sách lớp</h2>
                    <p className="mt-0.5 text-xs text-slate-500">{filteredClasses.length} lớp phù hợp</p>
                  </div>
                  <BookOpen className="h-5 w-5 text-slate-300" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th scope="col" className="px-5 py-3">Lớp học</th>
                        <th scope="col" className="px-4 py-3">Học kỳ</th>
                        <th scope="col" className="px-4 py-3">Sĩ số</th>
                        <th scope="col" className="px-4 py-3">Trạng thái</th>
                        <th scope="col" className="px-5 py-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredClasses.map((classItem) => (
                        <tr key={classItem.id} className={selectedClassId === classItem.id ? 'bg-blue-50/60' : 'hover:bg-slate-50/70'}>
                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-slate-900">{classItem.id}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{classItem.name}</p>
                          </td>
                          <td className="px-4 py-4 text-xs text-slate-600">{classItem.semester}</td>
                          <td className="px-4 py-4 text-xs font-semibold text-slate-700">{classItem.studentCount}</td>
                          <td className="px-4 py-4"><StatusBadge status={classItem.status} /></td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedClassId(classItem.id);
                                  setStudentSearch('');
                                }}
                                title="Xem danh sách sinh viên"
                                aria-label={`Xem danh sách sinh viên lớp ${classItem.id}`}
                                className={`flex h-8 w-8 items-center justify-center rounded-lg transition cursor-pointer ${
                                  selectedClassId === classItem.id
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'
                                }`}
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(classItem)}
                                title="Chỉnh sửa lớp"
                                aria-label={`Chỉnh sửa lớp ${classItem.id}`}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-amber-50 hover:text-amber-600 cursor-pointer"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeleteModal(classItem)}
                                title="Xóa lớp"
                                aria-label={`Xóa lớp ${classItem.id}`}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredClasses.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-5 py-14 text-center text-sm text-slate-400">
                            Không tìm thấy lớp phù hợp.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
                <div className="border-b border-slate-100 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-slate-900">Sinh viên</h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {selectedClass ? `${selectedClass.id} · ${selectedClass.name}` : 'Chọn một lớp để xem sinh viên'}
                      </p>
                    </div>
                    <Users className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
                  </div>
                  {selectedClass && (
                    <>
                      <label className="relative mt-4 block">
                        <span className="sr-only">Tìm sinh viên</span>
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                          value={studentSearch}
                          onChange={(event) => setStudentSearch(event.target.value)}
                          placeholder="Tìm mã, tên hoặc email..."
                          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                      <p className="mt-2 text-[11px] text-slate-400">
                        Hiển thị {filteredStudents.length} trong {selectedClass.students.length} sinh viên mẫu · sĩ số lớp {selectedClass.studentCount}
                      </p>
                    </>
                  )}
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => (
                    <article key={student.id} className="flex items-center gap-3 px-5 py-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                        {student.name.split(' ').slice(-2).map((part) => part[0]).join('')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{student.name}</p>
                        <p className="truncate text-xs text-slate-500">{student.id} · {student.email}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        student.status === 'Đang học'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {student.status}
                      </span>
                    </article>
                  ))}
                  {selectedClass && filteredStudents.length === 0 && (
                    <p className="px-5 py-10 text-center text-sm text-slate-400">Không tìm thấy sinh viên phù hợp.</p>
                  )}
                  {!selectedClass && (
                    <p className="px-5 py-10 text-center text-sm text-slate-400">Chọn một lớp để xem danh sách sinh viên.</p>
                  )}
                </div>
              </section>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              Dữ liệu lớp và sinh viên hiện là dữ liệu minh họa trên giao diện; thao tác tạo lớp chỉ lưu trong phiên hiện tại.
            </p>
          </div>
        </main>
      </div>

      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCreateModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-class-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="create-class-title" className="text-lg font-bold text-slate-900">Tạo lớp mới</h2>
                <p className="mt-1 text-sm text-slate-500">Nhập thông tin cơ bản để thêm lớp vào danh sách.</p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                aria-label="Đóng hộp thoại"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={createClass}>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">Mã lớp</span>
                <input
                  name="classId"
                  required
                  maxLength={20}
                  autoFocus
                  placeholder="Ví dụ: SE1850"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">Tên lớp</span>
                <input
                  name="className"
                  required
                  maxLength={100}
                  placeholder="Ví dụ: Lập trình Web"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">Học kỳ</span>
                <select
                  name="semester"
                  required
                  defaultValue={SEMESTERS[0]}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {SEMESTERS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              {createError && <p role="alert" className="text-sm font-medium text-red-600">{createError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Tạo lớp
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal Chỉnh sửa lớp */}
      {editingClass && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-class-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="edit-class-title" className="text-lg font-bold text-slate-900">Chỉnh sửa lớp học</h2>
                <p className="mt-1 text-sm text-slate-500">Cập nhật thông tin mã lớp, tên lớp, học kỳ và trạng thái.</p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                aria-label="Đóng hộp thoại"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={saveEditClass}>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">Mã lớp</span>
                <input
                  name="classId"
                  required
                  maxLength={20}
                  defaultValue={editingClass.id}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">Tên lớp</span>
                <input
                  name="className"
                  required
                  maxLength={100}
                  defaultValue={editingClass.name}
                  placeholder="Ví dụ: Lập trình Web"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">Học kỳ</span>
                  <select
                    name="semester"
                    required
                    defaultValue={editingClass.semester}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {SEMESTERS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">Trạng thái</span>
                  <select
                    name="status"
                    required
                    defaultValue={editingClass.status}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Hoạt động">Hoạt động</option>
                    <option value="Đã kết thúc">Đã kết thúc</option>
                  </select>
                </label>
              </div>
              {editError && <p role="alert" className="text-sm font-medium text-red-600">{editError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal Xác nhận xóa lớp */}
      {deletingClass && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDeleteModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-class-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 id="delete-class-title" className="text-lg font-bold text-slate-900">Xác nhận xóa lớp</h2>
                <p className="text-xs text-slate-500">Hành động này không thể hoàn tác.</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa lớp <strong className="font-bold text-slate-900">{deletingClass.id} - {deletingClass.name}</strong>?
              Danh sách <strong className="font-semibold text-slate-800">{deletingClass.studentCount} sinh viên</strong> trong lớp này sẽ được gỡ khỏi danh sách quản lý.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmDeleteClass}
                className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 cursor-pointer"
              >
                Xóa lớp học
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </label>
  );
}

function StatusBadge({ status }: { status: ClassStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
      status === 'Hoạt động' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === 'Hoạt động' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {status}
    </span>
  );
}
