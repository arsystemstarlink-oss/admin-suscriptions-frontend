import { useEffect } from 'react'
import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  CUSTOM_PLAN_MIN_CLIENTS,
} from '@/lib/constants'
import { getWhatsAppUrl, DEFAULT_TRIAL_DAYS } from '@/lib/business-plan'
import { useBusinessPlans } from '@/hooks/useOrganizationPlanPaymentReports'
import type { BusinessPlanCatalogItem, BusinessPlanKey } from '@/types/api'

const PLAN_CONTENT: Record<
  BusinessPlanKey,
  { features: string[]; action: string; message: string }
> = {
  basico: {
    features: ['WhatsApp incluido', 'Portal de consulta para clientes', 'Notificaciones'],
    action: 'Empezar gratis',
    message: 'Quiero la prueba gratis del plan Básico de A|R SYSTEM',
  },
  pro: {
    features: ['Todo lo del Básico', 'Para quien ya está creciendo'],
    action: 'Elegir Pro',
    message: 'Quiero el plan Pro de A|R SYSTEM',
  },
  negocio: {
    features: ['Todo lo del Pro', 'Para operaciones grandes'],
    action: 'Elegir Negocio',
    message: 'Quiero el plan Negocio de A|R SYSTEM',
  },
  'a-medida': {
    features: ['Para ISP y equipos grandes', 'Hablamos y lo armamos contigo'],
    action: 'Escribirnos',
    message: 'Quiero cotizar un plan a medida de A|R SYSTEM',
  },
}

const DEFAULT_ADMIN_LIMITS: Record<BusinessPlanKey, number> = {
  basico: 1,
  pro: 3,
  negocio: 5,
  'a-medida': 5,
}

function WhatsAppButton({
  message,
  children,
  variant = 'default',
  className,
}: {
  message: string
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'outline'
  className?: string
}) {
  const url = getWhatsAppUrl(message)

  if (!url) {
    return (
      <Button
        type="button"
        variant={variant}
        className={`disabled:opacity-100 disabled:cursor-not-allowed ${className ?? ''}`}
        disabled
      >
        {children}
      </Button>
    )
  }

  return (
    <Button asChild variant={variant} className={className}>
      <a href={url} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    </Button>
  )
}

function PlanCard({ plan }: { plan: BusinessPlanCatalogItem }) {
  const content = PLAN_CONTENT[plan.key]
  const capacity =
    plan.clientLimit === null
      ? `más de ${CUSTOM_PLAN_MIN_CLIENTS - 1} clientes`
      : `hasta ${plan.clientLimit} clientes`
  const adminLimit = plan.adminLimit ?? DEFAULT_ADMIN_LIMITS[plan.key]
  const adminCapacity =
    adminLimit === 1 ? '1 administrador incluido' : `Hasta ${adminLimit} administradores`

  return (
    <Card
      className={`flex h-full flex-col rounded-2xl border-[1.5px] bg-surface shadow-none ${
        plan.key === 'pro' ? 'border-primary ring-2 ring-secondary' : ''
      }`}
    >
      <CardContent className="flex h-full flex-col px-[22px] py-[26px]">
        <h3 className="text-xl font-extrabold leading-[1.1] tracking-[-0.02em]">{plan.label}</h3>
        <p className="mt-0.5 mb-[18px] text-sm text-muted-foreground">{capacity}</p>
        <p className="font-[Bricolage_Grotesque] text-[2.4rem] leading-none font-extrabold tracking-[-0.02em]">
          {plan.priceUsdMonthly === null ? 'Cotiza' : plan.priceUsdMonthly}
          {plan.priceUsdMonthly !== null && (
            <span className="ml-2 font-[Figtree] text-[0.95rem] font-medium text-muted-foreground">
              USD/mes
            </span>
          )}
        </p>
        <p className="mt-[6px] mb-5 text-[0.88rem] text-muted-foreground">
          {plan.priceUsdMonthly === null
            ? 'Precio según tu organización'
            : 'Por organización, no por administrador'}
        </p>
        <ul className="mt-0 mb-6 text-[0.95rem]">
          {[...content.features, adminCapacity].map((feature) => (
            <li key={feature} className="relative py-[5px] pl-[22px]">
              <Check className="absolute left-0 top-[9px] h-4 w-4 text-success" aria-hidden="true" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <WhatsAppButton
          message={content.message}
          variant={plan.key === 'pro' ? 'secondary' : 'default'}
          className="mt-auto h-auto w-full rounded-[10px] border-2 border-transparent px-6 py-[14px] text-base font-semibold disabled:opacity-100 disabled:cursor-not-allowed"
        >
          {content.action}
        </WhatsAppButton>
      </CardContent>
    </Card>
  )
}

const FAQS = [
  {
    question: '¿Mis clientes tienen que instalar algo?',
    answer:
      'No. Reciben un enlace, lo abren y ven su estado. Si quieren, lo guardan como app.',
  },
  {
    question: '¿Sirve si soy ISP de fibra óptica?',
    answer:
      'Sí. La app es para llevar en orden clientes, planes y pagos, sea cual sea tu tecnología: Starlink, fibra óptica u otra.',
  },
  {
    question: '¿La app corta o reactiva el servicio?',
    answer:
      'No. No se conecta a Starlink ni a tu red. Lleva en orden las cuentas y los datos que tú registras; cortar o reactivar el servicio lo sigues haciendo tú.',
  },
  {
    question: '¿Puedo cambiar de plan?',
    answer:
      'Sí, cuando quieras. Si llegas al límite de clientes, la app te avisa para que subas de plan.',
  },
  {
    question: '¿El plan se paga por cada administrador?',
    answer:
      'No. El plan es para tu organización y el límite de administradores depende del plan: 1 en Básico, 3 en Pro y 5 en Negocio o A medida. El límite incluye al administrador inicial. El precio depende del plan y sus límites, no se cobra por usuario.',
  },
  {
    question: '¿Quién paga los mensajes de WhatsApp?',
    answer:
      'Tú, directo a Twilio con tu propia cuenta. La app trae WhatsApp incluido en todos los planes; el costo de los mensajes es aparte.',
  },
  {
    question: '¿Qué recibo al registrarme?',
    answer:
      'Un correo y una contraseña de administrador para entrar a la app y empezar a registrar suscripciones.',
  },
]

export function PlansPage() {
  const hasWhatsAppNumber = Boolean(getWhatsAppUrl(''))
  const { data: plansData, isLoading: plansLoading } = useBusinessPlans()
  const plans = plansData?.plans ?? []
  const trialDays = plans.find((plan) => plan.key === 'basico')?.trialDays ?? DEFAULT_TRIAL_DAYS

  useEffect(() => {
    const preconnect = document.createElement('link')
    preconnect.rel = 'preconnect'
    preconnect.href = 'https://fonts.googleapis.com'
    preconnect.dataset.plansFont = 'preconnect'

    const crossOrigin = document.createElement('link')
    crossOrigin.rel = 'preconnect'
    crossOrigin.href = 'https://fonts.gstatic.com'
    crossOrigin.crossOrigin = 'anonymous'
    crossOrigin.dataset.plansFont = 'crossorigin'

    const stylesheet = document.createElement('link')
    stylesheet.rel = 'stylesheet'
    stylesheet.href =
      'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;800&family=Figtree:wght@400;500;600&display=swap'
    stylesheet.dataset.plansFont = 'stylesheet'

    document.head.append(preconnect, crossOrigin, stylesheet)

    return () => {
      preconnect.remove()
      crossOrigin.remove()
      stylesheet.remove()
    }
  }, [])

  return (
    <div className="plans-page-theme min-h-screen bg-background text-foreground">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface-elevated focus:px-4 focus:py-2 focus:text-surface-elevated-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        Ir al contenido
      </a>

      <header className="bg-header text-header-foreground">
        <div className="mx-auto max-w-[1040px] px-[22px] pb-[84px] pt-[22px]">
          <nav
            aria-label="Navegación de la página"
            className="mb-16 flex items-center justify-between gap-4"
          >
            <Link
              to="/planes"
              className="font-[Bricolage_Grotesque] text-lg font-extrabold tracking-[0.02em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-header"
            >
              A<span className="text-secondary">|</span>R SYSTEM
            </Link>
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="hidden rounded-md px-3 py-2 text-sm text-header-foreground hover:bg-header-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary sm:inline-flex"
              >
                Iniciar sesión
              </Link>
              <Button
                asChild
                variant="outline"
                className="h-auto rounded-[10px] border-2 border-header-foreground/40 bg-transparent px-[18px] py-[10px] text-base font-semibold text-header-foreground hover:border-header-foreground hover:bg-header-hover hover:text-header-foreground"
              >
                <a href="#planes">Ver planes</a>
              </Button>
            </div>
          </nav>

          <div className="grid items-center gap-12 min-[901px]:grid-cols-[1.15fr_0.85fr]">
            <div>
              <h1 className="max-w-3xl font-[Bricolage_Grotesque] text-[clamp(2.2rem,5.4vw,3.7rem)] font-extrabold leading-[1.1] tracking-[-0.02em]">
                Lleva en orden tus clientes de internet y tus cobros.
              </h1>
              <p className="mt-[22px] mb-[30px] max-w-2xl text-[1.15rem] text-header-foreground/80">
                Registra a tus clientes, sus planes y sus pagos. Sabe quién pagó, quién debe y quién
                vence, y avísales por WhatsApp. Para gestores de Starlink, ISP de fibra óptica y
                cualquier proveedor de internet.
              </p>
              <div className="flex flex-wrap gap-3">
                <WhatsAppButton
                  message="Hola, quiero la prueba gratis de A|R SYSTEM"
                  variant="secondary"
                  className="h-auto rounded-[10px] border-2 border-transparent px-6 py-[14px] text-base font-semibold"
                >
                  Pedir prueba gratis
                </WhatsAppButton>
                <Button
                  asChild
                  variant="outline"
                  className="h-auto rounded-[10px] border-2 border-header-foreground/40 bg-transparent px-6 py-[14px] text-base font-semibold text-header-foreground hover:border-header-foreground hover:bg-header-hover hover:text-header-foreground"
                >
                  <a href="#como">Cómo funciona</a>
                </Button>
              </div>
              <p className="mt-4 text-sm text-header-foreground/75">
                {trialDays} días gratis con el plan Básico.
              </p>
              {!hasWhatsAppNumber && (
                <p role="status" className="mt-2 text-sm text-header-foreground/75">
                  El contacto para pedir una prueba todavía no está disponible.
                </p>
              )}
            </div>

            <div
              aria-hidden="true"
              className="space-y-[14px] min-[901px]:ml-auto min-[901px]:max-w-[340px]"
            >
              <Card className="max-w-[340px] rounded-[18px] shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
                <CardContent className="px-5 py-[18px]">
                  <div className="mb-2 flex justify-between text-sm text-muted-foreground">
                    <span>A|R SYSTEM</span>
                    <span>ahora</span>
                  </div>
                  <p className="font-semibold">Pago recibido</p>
                  <p><span className="font-medium text-success">25 USD</span> · Plan mensual</p>
                </CardContent>
              </Card>
              <Card className="max-w-[340px] rounded-[18px] opacity-[0.92] shadow-[0_20px_50px_rgba(0,0,0,0.35)] min-[901px]:-translate-x-6">
                <CardContent className="px-5 py-[18px]">
                  <div className="mb-2 flex justify-between text-sm text-muted-foreground">
                    <span>A|R SYSTEM</span>
                    <span>hace 2 h</span>
                  </div>
                  <p className="font-semibold">Pago por vencer mañana</p>
                  <p className="text-sm text-muted-foreground">
                    Recordatorio enviado por WhatsApp
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </header>

      <main id="contenido">
        <section id="como" className="scroll-mt-4 bg-background px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Empieza en cuatro pasos</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Durante la prueba usas el plan Básico con tus propios clientes.
            </p>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Pide tu prueba', 'Escríbenos por WhatsApp y te registramos.'],
                ['Recibe tu acceso', 'Te enviamos un correo y una contraseña de administrador.'],
                ['Registra una suscripción', 'Entra a la app y agrega a tu primer cliente con su número.'],
                ['Recibe la notificación', 'La ves en tu celular y sabes que todo funciona.'],
              ].map(([title, description], index) => (
                <li key={title} className="relative">
                  <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-surface-muted px-4 py-14 text-surface-muted-foreground sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Lo que haces tú, lo hace la app
            </h2>
            <div className="mt-8 grid gap-x-12 sm:grid-cols-2">
              {[
                ['WhatsApp incluido en todos los planes', 'Envía recordatorios y mensajes a tus clientes desde su perfil, con tu propia cuenta.'],
                ['Quién pagó, quién debe, quién vence', 'Todo claro de un vistazo, sin abrir Excel ni buscar en chats.'],
                ['Tus clientes consultan solos', 'Abren un enlace, ven su estado y reportan su pago. Tú solo apruebas.'],
                ['Estado de cada cuenta', 'Define cuántos períodos vencidos permites y la app marca la cuenta como suspendida. El corte del servicio lo haces tú.'],
                ['Cobra como tus clientes pagan', 'Efectivo, transferencia, USDT o tarjeta, con referencia en bolívares.'],
                ['Funciona en el celular', 'Se instala como una app, sin pasar por ninguna tienda.'],
              ].map(([title, description]) => (
                <article key={title} className="border-t border-border py-5">
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  <p className="mt-1 text-sm">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="planes" className="scroll-mt-4 bg-background px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Elige según cuántos clientes gestionas
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Todos los planes incluyen WhatsApp y todas las funciones. Solo cambia el número de
              clientes.
            </p>
            <div className="mt-9 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {plansLoading ? (
                <p className="text-sm text-muted-foreground sm:col-span-2 xl:col-span-4">
                  Cargando planes...
                </p>
              ) : (
                plans.map((plan) => <PlanCard key={plan.key} plan={plan} />)
              )}
            </div>
            <div className="mt-6 rounded-xl border border-border bg-surface-muted p-5 text-surface-muted-foreground">
              <h3 className="font-semibold text-foreground">
                Un plan para toda tu organización
              </h3>
              <p className="mt-1 text-sm">
                Pagas por llevar la gestión de tu organización y sus clientes, no por cada usuario.
                Puedes dar acceso a varios administradores; todos trabajan con la información de
                esa misma organización.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-2 rounded-xl bg-header p-5 text-header-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>
                <strong className="text-secondary">{trialDays} días gratis</strong> en el plan
                Básico, con tus clientes reales.
              </p>
              <p className="text-sm text-header-foreground/80">
                Si pasas el límite, te avisamos y subes de plan cuando quieras.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-surface-muted px-4 py-14 text-surface-muted-foreground sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold">Lo que pagas aparte</h2>
              <p className="mt-3 text-sm">
                Los mensajes de WhatsApp los pagas directo a quien los presta. Así controlas tu gasto
                y nosotros no te lo encarecemos.
              </p>
              <ul className="mt-5">
                <li className="border-t border-border py-4">
                  <strong className="text-foreground">Tu cuenta de Twilio</strong>
                  <span className="mt-1 block text-sm">Tú la creas y la conectas a la app. Te explicamos cómo, paso a paso.</span>
                </li>
                <li className="border-t border-border py-4">
                  <strong className="text-foreground">Los mensajes que envíes</strong>
                  <span className="mt-1 block text-sm">Pagas solo por lo que uses.</span>
                </li>
                <li className="border-t border-border py-4">
                  <strong className="text-foreground">Las plantillas de WhatsApp</strong>
                  <span className="mt-1 block text-sm">Las aprueba WhatsApp. Te ayudamos a elegir las que necesitas.</span>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Extras, si prefieres que lo dejemos listo</h2>
              <p className="mt-3 text-sm">Pago único. Opcionales.</p>
              <ul className="mt-5">
                <li className="border-t border-border py-4">
                  <strong className="text-foreground">Configuración completa</strong>
                  <span className="mt-1 block text-sm">Conectamos tu Twilio y dejamos tus plantillas listas.</span>
                </li>
                <li className="border-t border-border py-4">
                  <strong className="text-foreground">Carga de tus clientes</strong>
                  <span className="mt-1 block text-sm">Pasamos tu lista de Excel a la app.</span>
                </li>
                <li className="border-t border-border py-4">
                  <strong className="text-foreground">Paquete de plantillas</strong>
                  <span className="mt-1 block text-sm">Recordatorio, pago recibido y aviso de suspensión, ya redactadas.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-background px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Preguntas frecuentes</h2>
            <div className="mt-7">
              {FAQS.map(({ question, answer }) => (
                <details key={question} className="border-t border-border py-5 last:border-b">
                  <summary className="cursor-pointer font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {question}
                  </summary>
                  <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-header px-4 py-14 text-center text-header-foreground sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Prueba el plan Básico {trialDays} días gratis
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-header-foreground/80">
              Escríbenos y te damos tu acceso. Si quieres, te ayudamos con la primera carga de
              clientes.
            </p>
            <WhatsAppButton
              message="Hola, quiero la prueba gratis de A|R SYSTEM"
              variant="secondary"
              className="mt-7"
            >
              Pedir prueba gratis
            </WhatsAppButton>
          </div>
        </section>
      </main>

      <footer className="bg-surface text-surface-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span className="font-extrabold tracking-wide text-foreground">
            A<span className="text-secondary">|</span>R SYSTEM
          </span>
          <span>Clientes y suscripciones para proveedores de internet</span>
          <Link
            to="/login"
            className="w-fit rounded-sm text-foreground underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Iniciar sesión
          </Link>
        </div>
      </footer>
    </div>
  )
}
