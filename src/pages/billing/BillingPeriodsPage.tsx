import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useBillingPeriods } from '@/hooks/useBilling'
import { useUIStore } from '@/stores/ui.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, FileText, AlertTriangle, Clock, CheckCircle2, CreditCard, Banknote, Calendar, Zap } from 'lucide-react'
import { formatCurrency, formatDate, PAYMENT_METHOD_LABELS } from '@/lib/constants'
import { getClientFullName } from '@/lib/utils'
import type { BillingPeriodWithDetails } from '@/types/api'

type ViewMode = 'action' | 'paid' | 'all'

export function BillingPeriodsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [viewMode, setViewMode] = useState<ViewMode>('action')
  const { openQuickPay } = useUIStore()

  const periodFilter = searchParams.get('period') || 'current'

  const { data: allData, isLoading } = useBillingPeriods({
    search: searchParams.get('search') || undefined,
    status: viewMode === 'paid' ? 'PAID' : undefined,
    periodLabel: periodFilter !== 'all' && periodFilter !== 'current' ? periodFilter : undefined,
    limit: 200,
  })

  // Extraer períodos únicos
  const availablePeriods = useMemo(() => {
    if (!allData?.periods) return []
    const periodLabels = new Set<string>()
    allData.periods.forEach(p => periodLabels.add(p.periodLabel))
    return Array.from(periodLabels).sort((a, b) => {
      const getYearMonth = (label: string) => {
        const match = label.match(/(\w+)\s+(\d{4})/)
        if (!match) return ''
        const months: Record<string, string> = {
          'Enero': '01', 'Febrero': '02', 'Marzo': '03', 'Abril': '04',
          'Mayo': '05', 'Junio': '06', 'Julio': '07', 'Agosto': '08',
          'Septiembre': '09', 'Octubre': '10', 'Noviembre': '11', 'Diciembre': '12'
        }
        return `${match[2]}-${months[match[1]] || '01'}`
      }
      return getYearMonth(b).localeCompare(getYearMonth(a))
    })
  }, [allData])

  const currentPeriod = availablePeriods[0] || ''

  // Calcular métricas de cobranza
  const metrics = useMemo(() => {
    if (!allData?.periods) return { 
      totalOverdue: 0, 
      totalPending: 0, 
      totalPaid: 0, 
      countOverdue: 0, 
      countPending: 0, 
      countPaid: 0,
      countExpiringSoon: 0,
      totalExpiringSoon: 0
    }
    
    const today = new Date()
    const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    const todayNormalized = new Date(todayUTC)
    const threeDaysFromNow = new Date(todayUTC + 3 * 24 * 60 * 60 * 1000)
    
    const overdue = allData.periods.filter(p => p.status === 'OVERDUE')
    const pending = allData.periods.filter(p => p.status === 'PENDING')
    const paid = allData.periods.filter(p => p.status === 'PAID')
    
    // Próximos a vencer (PENDING que vencen en próximos 3 días)
    const expiringSoon = pending.filter(p => {
      const endDate = new Date(p.endDate)
      return endDate >= todayNormalized && endDate <= threeDaysFromNow
    })
    
    return {
      totalOverdue: overdue.reduce((sum, p) => sum + p.amount, 0),
      totalPending: pending.reduce((sum, p) => sum + p.amount, 0),
      totalPaid: paid.reduce((sum, p) => sum + p.amount, 0),
      countOverdue: overdue.length,
      countPending: pending.length,
      countPaid: paid.length,
      countExpiringSoon: expiringSoon.length,
      totalExpiringSoon: expiringSoon.reduce((sum, p) => sum + p.amount, 0)
    }
  }, [allData])

  // Filtrar períodos según vista
  const displayPeriods = useMemo(() => {
    if (!allData?.periods) return { overdue: [], pending: [], paid: [] }

    let periods = allData.periods
    
    // Filtrar por período seleccionado
    if (periodFilter !== 'all') {
      const targetPeriod = periodFilter === 'current' ? currentPeriod : periodFilter
      if (targetPeriod) {
        periods = periods.filter(p => p.periodLabel === targetPeriod)
      }
    }

    // Filtrar por búsqueda
    if (search) {
      const searchLower = search.toLowerCase()
      periods = periods.filter(p => 
        getClientFullName(p.client).toLowerCase().includes(searchLower) ||
        p.subscription.kitNumber.toLowerCase().includes(searchLower)
      )
    }

    // Agrupar por estado
    const overdue = periods.filter(p => p.status === 'OVERDUE')
    const pending = periods.filter(p => p.status === 'PENDING')
    const paid = periods.filter(p => p.status === 'PAID')

    // Para vista "action", solo mostrar vencidos y próximos a vencer
    if (viewMode === 'action') {
      const today = new Date()
      const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
      const todayNormalized = new Date(todayUTC)
      const threeDaysFromNow = new Date(todayUTC + 3 * 24 * 60 * 60 * 1000)
      const expiringSoon = pending.filter(p => {
        const endDate = new Date(p.endDate)
        return endDate >= todayNormalized && endDate <= threeDaysFromNow
      })
      return { overdue, pending: expiringSoon, paid: [] }
    }

    if (viewMode === 'paid') {
      return { overdue: [], pending: [], paid }
    }

    return { overdue, pending, paid }
  }, [allData, periodFilter, currentPeriod, search, viewMode])

  const handleSearch = (value: string) => {
    setSearch(value)
    const params = new URLSearchParams(searchParams)
    if (value) params.set('search', value)
    else params.delete('search')
    setSearchParams(params)
  }

  const handlePeriodFilter = (value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value && value !== 'current') {
      params.set('period', value)
    } else {
      params.delete('period')
    }
    setSearchParams(params)
  }

  const handlePay = (period: BillingPeriodWithDetails) => {
    openQuickPay({ period })
  }

  // Calcular urgencia del período
  const getUrgencyLevel = (period: BillingPeriodWithDetails): 'critical' | 'high' | 'medium' | 'low' => {
    if (period.status === 'PAID') return 'low'
    
    const today = new Date()
    const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    const endDate = new Date(period.endDate)
    const endDateUTC = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
    const daysDiff = Math.ceil((endDateUTC - todayUTC) / (1000 * 60 * 60 * 24))
    
    if (period.status === 'OVERDUE') {
      if (daysDiff < -7) return 'critical' // Vencido hace más de 7 días
      return 'high' // Vencido hace menos de 7 días
    }
    
    if (period.status === 'PENDING') {
      if (daysDiff <= 3) return 'medium' // Vence en próximos 3 días
      return 'low'
    }
    
    return 'low'
  }

  const getUrgencyColor = (urgency: 'critical' | 'high' | 'medium' | 'low') => {
    switch (urgency) {
      case 'critical':
        return 'border-l-red-700 bg-red-50 text-red-700 dark:border-l-red-400 dark:bg-red-950/50 dark:text-red-400'
      case 'high':
        return 'border-l-red-600 bg-red-50 text-red-700 dark:border-l-red-400 dark:bg-red-950/50 dark:text-red-400'
      case 'medium':
        return 'border-l-amber-600 bg-amber-50 text-amber-700 dark:border-l-amber-400 dark:bg-amber-950/50 dark:text-amber-400'
      case 'low':
        return 'border-l-emerald-600 bg-emerald-50 text-emerald-700 dark:border-l-emerald-400 dark:bg-emerald-950/50 dark:text-emerald-400'
    }
  }

  const getStatusBadgeClass = (status: BillingPeriodWithDetails['status']) => {
    if (status === 'OVERDUE') {
      return 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/50'
    }
    if (status === 'PENDING') {
      return 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/50'
    }
    return 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50'
  }

  const renderPeriodCard = (period: BillingPeriodWithDetails) => {
    const urgency = getUrgencyLevel(period)
    const urgencyColor = getUrgencyColor(urgency)
    
    return (
      <div
        key={period.id}
        className={`flex flex-col gap-3 p-4 rounded-lg border-l-4 ${urgencyColor} md:flex-row md:items-center md:justify-between transition-all hover:shadow-md`}
      >
        <div className="flex-1 min-w-0 text-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{period.periodLabel}</p>
            <Badge className={getStatusBadgeClass(period.status)}>
              {period.status === 'OVERDUE' ? 'Vencido' : period.status === 'PENDING' ? 'Pendiente' : 'Pagado'}
            </Badge>
            {urgency === 'critical' && (
              <Badge variant="destructive" className="animate-pulse">
                <AlertTriangle className="h-3 w-3 mr-1 shrink-0" />
                Crítico
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
            <span className="truncate font-medium">{getClientFullName(period.client)}</span>
            <span>Kit #{period.subscription.kitNumber}</span>
            <span>{period.plan.name}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm">
            <span className="text-muted-foreground">
              {formatDate(period.startDate)} — {formatDate(period.endDate)}
            </span>
            {period.status === 'PAID' && period.paidAt && (
              <div className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50">
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span className="font-medium">Pagado el {formatDate(period.paidAt)}</span>
              </div>
            )}
          </div>
          {period.status === 'PAID' && period.paymentMethod && (
            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
              {period.paymentMethod === 'CASH' ? (
                <Banknote className="h-3 w-3 shrink-0" />
              ) : (
                <CreditCard className="h-3 w-3 shrink-0" />
              )}
              <span>{PAYMENT_METHOD_LABELS[period.paymentMethod]}</span>
              {period.paymentMethod === 'INITIAL_PAYMENT' && (
                <Badge className="text-xs ml-1 text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/50">
                  Datos pendientes
                </Badge>
              )}
              {period.notes && (
                <span className="text-muted-foreground italic">• "{period.notes}"</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <p className="text-lg font-bold text-foreground">
            {formatCurrency(period.amount)}
          </p>
          {period.status !== 'PAID' && (
              <Button 
              size="sm" 
              className="gap-2 shadow-md" 
              onClick={() => handlePay(period)}
            >
              <Zap className="h-4 w-4 shrink-0" />
              <span>Cobrar</span>
            </Button>
          )}
        </div>
      </div>
    )
  }

  const renderSection = (
    title: string,
    icon: React.ReactNode,
    periods: BillingPeriodWithDetails[],
    total: number,
    headerColor: string
  ) => {
    if (periods.length === 0) return null

    return (
      <div className="space-y-3">
        <div className={`flex items-center justify-between p-3 rounded-lg ${headerColor}`}>
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-semibold">{title}</h3>
            <Badge variant="outline" className="ml-2">
              {periods.length}
            </Badge>
          </div>
          <p className="font-bold">{formatCurrency(total)}</p>
        </div>
        <div className="space-y-2">
          {periods.map(period => renderPeriodCard(period))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header con métricas */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Centro de Cobranzas</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">Gestión inteligente de pagos y facturación</p>
      </div>

      {/* Tabs de navegación */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="action" className="gap-2">
            <Zap className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">Acción Requerida</span>
            <span className="md:hidden">Acción</span>
            {(displayPeriods.overdue.length + displayPeriods.pending.length) > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {displayPeriods.overdue.length + displayPeriods.pending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="paid" className="gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">Pagados</span>
            <span className="md:hidden">Pagados</span>
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">Todos</span>
            <span className="md:hidden">Todos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={viewMode} className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative flex-1 w-full md:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="Buscar por cliente, kit..."
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <div className="w-full md:w-48">
                  <Select value={periodFilter} onValueChange={handlePeriodFilter}>
                    <SelectTrigger className="w-full">
                      <Calendar className="h-4 w-4 mr-2 shrink-0" />
                      <SelectValue placeholder="Seleccionar período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">
                        {currentPeriod ? `Período actual (${currentPeriod})` : 'Período actual'}
                      </SelectItem>
                      <SelectItem value="all">Todos los períodos</SelectItem>
                      {availablePeriods.map(period => (
                        <SelectItem key={period} value={period}>
                          {period}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contenido */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : !allData || allData.periods.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 shrink-0" />
                <p className="text-muted-foreground">No se encontraron períodos</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {viewMode === 'action' && (
                <>
                  {renderSection(
                    'Vencidos - Cobrar Inmediatamente',
                    <AlertTriangle className="h-5 w-5 shrink-0" />,
                    displayPeriods.overdue,
                    metrics.totalOverdue,
                    'border border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-400'
                  )}
                  {renderSection(
                    'Próximos a Vencer - Contactar Cliente',
                    <Clock className="h-5 w-5 shrink-0" />,
                    displayPeriods.pending,
                    metrics.totalExpiringSoon,
                    'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-400'
                  )}
                  {displayPeriods.overdue.length === 0 && displayPeriods.pending.length === 0 && (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50">
                          <CheckCircle2 className="h-12 w-12 shrink-0" />
                        </div>
                        <p className="text-foreground font-medium">¡Excelente! No hay acciones pendientes</p>
                        <p className="text-muted-foreground text-sm mt-2">Todos los períodos están al día</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {viewMode === 'paid' && (
                <>
                  {renderSection(
                    'Historial de Pagos',
                    <CheckCircle2 className="h-5 w-5 shrink-0" />,
                    displayPeriods.paid,
                    metrics.totalPaid,
                    'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-400'
                  )}
                  {displayPeriods.paid.length === 0 && (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 shrink-0" />
                        <p className="text-muted-foreground">No hay pagos registrados</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {viewMode === 'all' && (
                <>
                  {renderSection(
                    'Vencidos',
                    <AlertTriangle className="h-5 w-5 shrink-0" />,
                    displayPeriods.overdue,
                    metrics.totalOverdue,
                    'border border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-400'
                  )}
                  {renderSection(
                    'Pendientes',
                    <Clock className="h-5 w-5 shrink-0" />,
                    displayPeriods.pending,
                    metrics.totalPending,
                    'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-400'
                  )}
                  {renderSection(
                    'Pagados',
                    <CheckCircle2 className="h-5 w-5 shrink-0" />,
                    displayPeriods.paid,
                    metrics.totalPaid,
                    'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-400'
                  )}
                </>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
