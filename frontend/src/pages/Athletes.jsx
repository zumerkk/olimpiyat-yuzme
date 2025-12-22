// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Sporcular Sayfası
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api, { formatDate, formatCurrency } from '../utils/api'
import toast from 'react-hot-toast'
import {
  Search, Plus, Filter, ChevronLeft, ChevronRight, Eye, Edit2, Trash2, X, User,
  Calendar, CreditCard, Package, RefreshCw
} from 'lucide-react'

const STATUSES = ['Aktif', 'Pasif', 'Beklemede', 'Ayrıldı']
const MEMBERSHIP_TYPES = ['Aylık', '8 Seanslık']

export default function Athletes() {
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 })
  const [filters, setFilters] = useState({ search: '', status: '', membershipType: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingAthlete, setEditingAthlete] = useState(null)
  const [formData, setFormData] = useState({})

  useEffect(() => {
    fetchAthletes()
  }, [pagination.current, filters])

  const fetchAthletes = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.current,
        limit: 15,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      })
      const response = await api.get(`/athletes?${params}`)
      setAthletes(response.data.data)
      setPagination(response.data.pagination)
    } catch (error) {
      toast.error('Sporcular yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingAthlete) {
        await api.put(`/athletes/${editingAthlete._id}`, formData)
        toast.success('Sporcu güncellendi')
      } else {
        await api.post('/athletes', formData)
        toast.success('Sporcu eklendi')
      }
      setShowModal(false)
      setEditingAthlete(null)
      setFormData({})
      fetchAthletes()
    } catch (error) {
      toast.error(error.response?.data?.message || 'İşlem başarısız')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Bu sporcuyu silmek istediğinizden emin misiniz?')) return
    try {
      await api.delete(`/athletes/${id}`)
      toast.success('Sporcu silindi')
      fetchAthletes()
    } catch (error) {
      toast.error('Silme işlemi başarısız')
    }
  }

  const handleRenewPackage = async (id) => {
    if (!confirm('Paketi yenilemek istediğinizden emin misiniz? 8 seans hakkı eklenecek.')) return
    try {
      await api.post(`/athletes/${id}/renew-package`)
      toast.success('Paket yenilendi, 8 seans hakkı eklendi')
      fetchAthletes()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Paket yenileme başarısız')
    }
  }

  const openEditModal = (athlete) => {
    setEditingAthlete(athlete)
    setFormData({
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      tcNo: athlete.tcNo,
      birthDate: athlete.birthDate?.split('T')[0],
      gender: athlete.gender,
      phone: athlete.phone || '',
      email: athlete.email || '',
      address: athlete.address || '',
      membershipType: athlete.membershipType,
      monthlyFee: athlete.monthlyFee || 1500,
      packageFee: athlete.packageFee || 1200,
      status: athlete.status,
      guardian: athlete.guardian || {},
      healthInfo: athlete.healthInfo || {},
      notes: athlete.notes || ''
    })
    setShowModal(true)
  }

  const openAddModal = () => {
    setEditingAthlete(null)
    setFormData({
      firstName: '',
      lastName: '',
      tcNo: '',
      birthDate: '',
      gender: 'Erkek',
      phone: '',
      email: '',
      address: '',
      membershipType: 'Aylık',
      monthlyFee: 1500,
      packageFee: 1200,
      status: 'Aktif',
      guardian: {},
      healthInfo: {},
      notes: ''
    })
    setShowModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Sporcular</h1>
          <p className="text-gray-500 text-sm mt-1">Toplam {pagination.total} sporcu kayıtlı</p>
        </div>
        <button onClick={openAddModal} className="btn-primary">
          <Plus className="w-5 h-5" />
          Sporcu Ekle
        </button>
      </div>

      {/* Search & Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="İsim veya TC No ile ara..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="input pl-10"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary ${showFilters ? 'bg-primary-100 text-primary-700' : ''}`}
          >
            <Filter className="w-5 h-5" />
            Filtrele
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="select"
                >
                  <option value="">Tüm Durumlar</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                  value={filters.membershipType}
                  onChange={(e) => setFilters({ ...filters, membershipType: e.target.value })}
                  className="select"
                >
                  <option value="">Tüm Üyelik Tipleri</option>
                  {MEMBERSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Athletes List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="spinner"></div>
          </div>
        ) : athletes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <User className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500">Henüz sporcu kaydı bulunamadı</p>
            <button onClick={openAddModal} className="btn-primary mt-4">
              <Plus className="w-5 h-5" />
              İlk Sporcuyu Ekle
            </button>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sporcu</th>
                    <th>TC Kimlik No</th>
                    <th>Üyelik Tipi</th>
                    <th>Seans Durumu</th>
                    <th>Durum</th>
                    <th>Kayıt Tarihi</th>
                    <th className="text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {athletes.map((athlete) => (
                    <tr key={athlete._id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold">
                            {athlete.firstName?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{athlete.firstName} {athlete.lastName}</p>
                            <p className="text-sm text-gray-500">{athlete.gender} - {athlete.age} yaş</p>
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-sm">{athlete.tcNo}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          {athlete.membershipType === 'Aylık' ? (
                            <Calendar className="w-4 h-4 text-blue-500" />
                          ) : (
                            <Package className="w-4 h-4 text-purple-500" />
                          )}
                          <span className={`badge ${
                            athlete.membershipType === 'Aylık' ? 'badge-info' : 'badge-primary'
                          }`}>
                            {athlete.membershipType}
                          </span>
                        </div>
                      </td>
                      <td>
                        {athlete.membershipType === 'Aylık' ? (
                          <span className="text-sm text-green-600 font-medium">Sınırsız</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${
                              athlete.remainingSessions <= 2 ? 'text-red-600' : 
                              athlete.remainingSessions <= 4 ? 'text-amber-600' : 'text-green-600'
                            }`}>
                              {athlete.remainingSessions || 0} / 8
                            </span>
                            <span className="text-xs text-gray-500">seans kaldı</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${
                          athlete.status === 'Aktif' ? 'badge-success' :
                          athlete.status === 'Pasif' ? 'badge-warning' :
                          athlete.status === 'Ayrıldı' ? 'badge-danger' : 'badge-info'
                        }`}>
                          {athlete.status}
                        </span>
                      </td>
                      <td className="text-sm text-gray-500">{formatDate(athlete.createdAt)}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          {athlete.membershipType === '8 Seanslık' && athlete.remainingSessions <= 2 && (
                            <button
                              onClick={() => handleRenewPackage(athlete._id)}
                              className="p-2 hover:bg-green-50 rounded-lg text-green-600"
                              title="Paketi Yenile"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          <Link
                            to={`/sporcular/${athlete._id}`}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                            title="Detay"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => openEditModal(athlete)}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                            title="Düzenle"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(athlete._id)}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Sayfa {pagination.current} / {pagination.pages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination({ ...pagination, current: pagination.current - 1 })}
                    disabled={pagination.current === 1}
                    className="btn-secondary btn-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPagination({ ...pagination, current: pagination.current + 1 })}
                    disabled={pagination.current === pagination.pages}
                    className="btn-secondary btn-sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-content max-w-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingAthlete ? 'Sporcu Düzenle' : 'Yeni Sporcu Ekle'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Kişisel Bilgiler */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Kişisel Bilgiler</h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Ad *</label>
                      <input
                        type="text"
                        value={formData.firstName || ''}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Soyad *</label>
                      <input
                        type="text"
                        value={formData.lastName || ''}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">TC Kimlik No *</label>
                      <input
                        type="text"
                        value={formData.tcNo || ''}
                        onChange={(e) => setFormData({ ...formData, tcNo: e.target.value })}
                        className="input"
                        maxLength={11}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Doğum Tarihi *</label>
                      <input
                        type="date"
                        value={formData.birthDate || ''}
                        onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Cinsiyet *</label>
                      <select
                        value={formData.gender || 'Erkek'}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="select"
                        required
                      >
                        <option value="Erkek">Erkek</option>
                        <option value="Kadın">Kadın</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Telefon</label>
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>
                </div>

                {/* Üyelik Bilgileri - ÖNEMLİ KISIM */}
                <div className="bg-gradient-to-r from-primary-50 to-blue-50 p-4 rounded-xl border border-primary-100">
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary-600" />
                    Üyelik Tipi Seçimi
                  </h4>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Aylık Üyelik Seçeneği */}
                    <label className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      formData.membershipType === 'Aylık' 
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="membershipType"
                        value="Aylık"
                        checked={formData.membershipType === 'Aylık'}
                        onChange={(e) => setFormData({ ...formData, membershipType: e.target.value })}
                        className="sr-only"
                      />
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          formData.membershipType === 'Aylık' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">Aylık Üyelik</p>
                          <p className="text-sm text-gray-500 mt-1">Sınırsız seans hakkı</p>
                          <p className="text-xs text-gray-400 mt-1">Her ayın 15'inde ödeme</p>
                        </div>
                      </div>
                      {formData.membershipType === 'Aylık' && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center">
                          ✓
                        </div>
                      )}
                    </label>

                    {/* 8 Seanslık Paket Seçeneği */}
                    <label className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      formData.membershipType === '8 Seanslık' 
                        ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="membershipType"
                        value="8 Seanslık"
                        checked={formData.membershipType === '8 Seanslık'}
                        onChange={(e) => setFormData({ ...formData, membershipType: e.target.value })}
                        className="sr-only"
                      />
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          formData.membershipType === '8 Seanslık' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Package className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">8 Seanslık Paket</p>
                          <p className="text-sm text-gray-500 mt-1">8 seans hakkı</p>
                          <p className="text-xs text-gray-400 mt-1">Her yoklamada 1 hak düşer</p>
                        </div>
                      </div>
                      {formData.membershipType === '8 Seanslık' && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center">
                          ✓
                        </div>
                      )}
                    </label>
                  </div>

                  {/* Ücret Bilgileri */}
                  <div className="grid sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-primary-100">
                    <div>
                      <label className="label">Aylık Ücret (₺)</label>
                      <input
                        type="number"
                        value={formData.monthlyFee || 1500}
                        onChange={(e) => setFormData({ ...formData, monthlyFee: parseInt(e.target.value) })}
                        className="input"
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="label">8 Seanslık Paket Ücreti (₺)</label>
                      <input
                        type="number"
                        value={formData.packageFee || 1200}
                        onChange={(e) => setFormData({ ...formData, packageFee: parseInt(e.target.value) })}
                        className="input"
                        min={0}
                      />
                    </div>
                  </div>
                </div>

                {/* Veli Bilgileri */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Veli Bilgileri</h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Veli Adı</label>
                      <input
                        type="text"
                        value={formData.guardian?.name || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          guardian: { ...formData.guardian, name: e.target.value } 
                        })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Veli Telefon</label>
                      <input
                        type="tel"
                        value={formData.guardian?.phone || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          guardian: { ...formData.guardian, phone: e.target.value } 
                        })}
                        className="input"
                      />
                    </div>
                  </div>
                </div>

                {/* Durum */}
                <div>
                  <label className="label">Durum</label>
                  <select
                    value={formData.status || 'Aktif'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="select"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Notlar */}
                <div>
                  <label className="label">Notlar</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input"
                    rows={3}
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                    İptal
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingAthlete ? 'Güncelle' : 'Kaydet'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
