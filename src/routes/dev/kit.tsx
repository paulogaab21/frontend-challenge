import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as Icons from '@/components/icons'
import { PageShell } from '@/components/layout/page-shell'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { MobileTopBar } from '@/components/layout/mobile-top-bar'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button, type ButtonProps } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { PasswordInput } from '@/components/ui/password-input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Toaster } from '@/components/ui/sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export const Route = createFileRoute('/dev/kit')({ component: KitPage })

const variants: { variant: NonNullable<ButtonProps['variant']>; label: string }[] = [
  { variant: 'primary', label: 'EXPLORAR' },
  { variant: 'outline', label: 'Favoritar' },
  { variant: 'ghost', label: 'Voltar' },
  { variant: 'link', label: 'Continuar explorando' },
  { variant: 'icon', label: 'Ícone' },
  { variant: 'social', label: 'Continuar com Google' },
  { variant: 'gradient', label: 'Confirmar compra' },
  { variant: 'secondary', label: 'Carteiras' },
  { variant: 'destructive', label: 'Remover' },
  { variant: 'default', label: 'COMPRAR' },
]
const sectionClass = 'scroll-mt-6 border-t border-line py-10'
const headingClass = 'mb-6 text-2xl font-bold'
const gridClass = 'grid min-w-0 gap-6 md:grid-cols-2 xl:grid-cols-3'
const iconEntries = Object.entries(Icons)

function KitPage() {
  const [range, setRange] = useState([2, 1230])
  const [page, setPage] = useState(1)
  const [showRare, setShowRare] = useState(true)
  const [network, setNetwork] = useState('ethereum')
  const [filterOpen, setFilterOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const form = useForm<{ email: string }>({ defaultValues: { email: '' }, mode: 'onTouched' })
  const explain = () => {
    toast.info('Demonstração do componente', {
      description: 'O catálogo não envia dados nem realiza compras.',
    })
  }
  const formattedRange = range.map((value) =>
    (value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
  )

  return (
    <TooltipProvider>
      <PageShell
        header={{
          activeNav: 'inicio',
          cartCount: 6,
          divider: true,
          onSearch: () => document.getElementById('campos')?.focus(),
        }}
        footer={{ onNewsletterSubmit: explain }}
        mobileTopBar={{
          variant: 'home',
          query: searchQuery,
          onSearchChange: setSearchQuery,
          onFilter: () => setFilterOpen(true),
          onSearchSubmit: explain,
        }}
        mobileTabBar={{ activeTab: 'inicio', cartCount: 6, onAction: explain }}
      >
        <div className="container-page py-10 md:py-14">
          <p className="text-sm font-bold tracking-brand text-amber">KURIO</p>
          <h1 className="mt-3 text-28 font-bold md:text-[32px] md:leading-10">
            Catálogo de componentes
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-sand">
            Use Tab para conferir o foco, as setas para navegar nas abas e Esc para fechar os
            painéis. Os exemplos são apenas uma demonstração visual.
          </p>
          <nav
            aria-label="Seções do catálogo"
            className="my-8 flex flex-wrap gap-x-6 gap-y-3 text-amber"
          >
            {[
              'Botões',
              'Campos',
              'Seleção',
              'Navegação',
              'Feedback',
              'Sobreposições',
              'Ícones',
              'Shell',
            ].map((label, index) => (
              <a
                className="underline-offset-4 hover:underline"
                key={label}
                href={`#${['botoes', 'campos', 'selecao', 'navegacao', 'feedback', 'sobreposicoes', 'icones', 'shell'][index]}`}
              >
                {label}
              </a>
            ))}
          </nav>

          <section id="botoes" className={sectionClass} aria-labelledby="botoes-title">
            <h2 id="botoes-title" className={headingClass}>
              Botões
            </h2>
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {variants.map(({ variant, label }) => (
                <div key={variant} className="min-w-0 space-y-3">
                  <h3 className="text-sm text-sand">{variant}</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={variant}
                          size={variant === 'icon' ? 'icon' : 'default'}
                          onClick={explain}
                          aria-label={variant === 'icon' ? 'Adicionar' : undefined}
                        >
                          {variant === 'icon' ? (
                            <Icons.PlusIcon />
                          ) : (
                            <>
                              {variant === 'social' && <Icons.GoogleIcon />}
                              {label}
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Passe o mouse ou use Tab para conferir o estado.
                      </TooltipContent>
                    </Tooltip>
                    <Button
                      variant={variant}
                      size={variant === 'icon' ? 'icon' : 'default'}
                      disabled
                      aria-label={variant === 'icon' ? 'Adicionar indisponível' : undefined}
                    >
                      {variant === 'icon' ? <Icons.PlusIcon /> : label}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <h3 className="mt-10 mb-4 text-lg font-bold">Tamanhos e estados</h3>
            <div className="flex flex-wrap items-center gap-4">
              <Button size="header">
                <Icons.LogoutIcon />
                Entrar
              </Button>
              <Button size="sm" className="w-[92px]">
                Aplicar
              </Button>
              <Button className="w-[140px]">EXPLORAR</Button>
              <Button size="lg" className="w-[180px]">
                Criar conta
              </Button>
              <Button size="mobile">Entrar</Button>
              <Button variant="gradient" size="pill">
                Conectar e finalizar
              </Button>
              <Button variant="icon" size="icon-sm" aria-label="Diminuir">
                <Icons.MinusIcon size={14} />
              </Button>
              <Button variant="icon" size="icon" aria-label="Adicionar">
                <Icons.PlusIcon />
              </Button>
              <Button variant="icon" size="icon-lg" aria-label="Favoritar">
                <Icons.HeartIcon />
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button className="bg-amber">Ao passar o mouse</Button>
              <Button className="outline-2 outline-offset-2 outline-ring">Foco visível</Button>
              <Button loading className="w-[180px]">
                Criar conta
              </Button>
              <Button asChild variant="link">
                <a href="#campos">Continuar explorando</a>
              </Button>
              <Button asChild loading>
                <a href="#campos">Explorar</a>
              </Button>
              <Button variant="social">
                <Icons.FacebookBrandIcon />
                Continuar com Facebook
              </Button>
            </div>
          </section>

          <section
            id="campos"
            tabIndex={-1}
            className={sectionClass}
            aria-labelledby="campos-title"
          >
            <h2 id="campos-title" className={headingClass}>
              Campos
            </h2>
            <div className={gridClass}>
              <div className="space-y-2">
                <Label htmlFor="email-default" required>
                  E-mail
                </Label>
                <Input id="email-default" type="email" required placeholder="contato@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="input-focus">Nome de exibição</Label>
                <Input
                  id="input-focus"
                  placeholder="Nome de exibição"
                  className="border-copper ring-2 ring-copper/25"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="input-invalid" required>
                  E-mail
                </Label>
                <Input
                  id="input-invalid"
                  type="email"
                  required
                  defaultValue="contato"
                  aria-invalid="true"
                  aria-describedby="email-error"
                />
                <p
                  id="email-error"
                  role="alert"
                  className="flex items-center gap-1 text-xs text-coral"
                >
                  <Icons.AlertIcon size={14} />
                  Informe um e-mail válido.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="input-disabled">Nome de usuário</Label>
                <Input id="input-disabled" placeholder="Nome de usuário" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="input-mobile">E-mail — mobile</Label>
                <Input
                  id="input-mobile"
                  type="email"
                  sizeVariant="mobile"
                  placeholder="contato@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <PasswordInput id="password" defaultValue="kurio-exemplo" autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-invalid" required>
                  Senha
                </Label>
                <PasswordInput
                  id="password-invalid"
                  required
                  aria-invalid="true"
                  aria-describedby="password-error"
                />
                <p id="password-error" className="text-xs text-coral">
                  Informe sua senha.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-disabled">Senha — indisponível</Label>
                <PasswordInput id="password-disabled" disabled defaultValue="kurio" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-mobile">Senha — mobile</Label>
                <PasswordInput id="password-mobile" sizeVariant="mobile" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Biografia</Label>
                <Textarea id="bio" placeholder="Conte um pouco sobre você..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio-invalid">Biografia — inválida</Label>
                <Textarea
                  id="bio-invalid"
                  defaultValue="…"
                  aria-invalid="true"
                  aria-describedby="bio-error"
                />
                <p id="bio-error" className="text-xs text-coral">
                  Revise sua biografia.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio-disabled">Biografia — indisponível</Label>
                <Textarea id="bio-disabled" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio-mobile">Biografia — mobile</Label>
                <Textarea
                  id="bio-mobile"
                  sizeVariant="mobile"
                  placeholder="Conte um pouco sobre você..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio-responsive">Biografia — responsiva</Label>
                <Textarea
                  id="bio-responsive"
                  sizeVariant="responsive"
                  placeholder="Conte um pouco sobre você..."
                />
              </div>
            </div>
            <h3 className="mt-8 mb-4 text-lg font-bold">Formulário acessível</h3>
            <Form {...form}>
              <form className="max-w-md space-y-4" noValidate onSubmit={form.handleSubmit(explain)}>
                <FormField
                  control={form.control}
                  name="email"
                  rules={{
                    required: 'Informe seu e-mail.',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Informe um e-mail válido.',
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>E-mail</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" required placeholder="contato@email.com" />
                      </FormControl>
                      <FormDescription>Use seu e-mail de colecionador.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit">Salvar</Button>
              </form>
            </Form>
          </section>

          <section id="selecao" className={sectionClass} aria-labelledby="selecao-title">
            <h2 id="selecao-title" className={headingClass}>
              Seleção
            </h2>
            <div className={gridClass}>
              <div className="space-y-2">
                <Label htmlFor="network-select">Rede</Label>
                <Select defaultValue="ethereum">
                  <SelectTrigger id="network-select">
                    <SelectValue placeholder="Selecione a rede" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Rede</SelectLabel>
                      <SelectItem value="ethereum">Ethereum</SelectItem>
                      <SelectItem value="polygon">Polygon</SelectItem>
                      <SelectSeparator />
                      <SelectItem value="solana">Solana</SelectItem>
                      <SelectItem value="disabled" disabled>
                        Em breve
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="select-invalid">Rede — inválida</Label>
                <Select>
                  <SelectTrigger
                    id="select-invalid"
                    aria-invalid="true"
                    aria-describedby="select-error"
                  >
                    <SelectValue placeholder="Selecione a rede" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                  </SelectContent>
                </Select>
                <p id="select-error" className="text-xs text-coral">
                  Selecione uma rede.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="select-disabled">Rede — indisponível</Label>
                <Select disabled>
                  <SelectTrigger id="select-disabled">
                    <SelectValue placeholder="Selecione a rede" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="select-mobile">Rede — mobile</Label>
                <Select>
                  <SelectTrigger id="select-mobile" size="mobile">
                    <SelectValue placeholder="Selecione a rede" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                    <SelectItem value="polygon">Polygon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="select-small">Rede — compacto</Label>
                <Select defaultValue="ethereum">
                  <SelectTrigger id="select-small" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="select-responsive">Rede — responsiva</Label>
                <Select>
                  <SelectTrigger id="select-responsive" size="responsive">
                    <SelectValue placeholder="Selecione a rede" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <fieldset className="space-y-4">
                <legend className="mb-4 text-lg font-bold">Coleções</legend>
                <div className="flex items-center gap-3">
                  <Checkbox id="checkbox-default" />
                  <Label htmlFor="checkbox-default">Arte digital</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox id="checkbox-checked" defaultChecked />
                  <Label htmlFor="checkbox-checked">Fotografia</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox id="checkbox-mixed" checked="indeterminate" />
                  <Label htmlFor="checkbox-mixed">Coleções selecionadas</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox id="checkbox-disabled" disabled />
                  <Label htmlFor="checkbox-disabled">Em breve</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="checkbox-invalid"
                    aria-invalid="true"
                    aria-describedby="checkbox-error"
                  />
                  <Label htmlFor="checkbox-invalid">Aceitar os termos</Label>
                </div>
                <p id="checkbox-error" className="text-xs text-coral">
                  Aceite os termos para continuar.
                </p>
              </fieldset>
              <fieldset>
                <legend className="mb-4 text-lg font-bold">Carteira e rede</legend>
                <RadioGroup defaultValue="walletconnect" aria-label="Carteira e rede">
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="walletconnect" id="radio-wallet" />
                    <Label htmlFor="radio-wallet">WalletConnect</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="metamask" id="radio-meta" />
                    <Label htmlFor="radio-meta">MetaMask</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="coinbase" id="radio-coinbase" disabled />
                    <Label htmlFor="radio-coinbase">Coinbase Wallet — em breve</Label>
                  </div>
                </RadioGroup>
                <RadioGroup className="mt-4" aria-label="Rede obrigatória">
                  <div className="flex items-center gap-3">
                    <RadioGroupItem
                      value="required"
                      id="radio-invalid"
                      aria-invalid="true"
                      aria-describedby="radio-error"
                    />
                    <Label htmlFor="radio-invalid">Ethereum</Label>
                  </div>
                </RadioGroup>
                <p id="radio-error" className="mt-2 text-xs text-coral">
                  Selecione uma rede.
                </p>
              </fieldset>
            </div>
            <div className="mt-8 max-w-md space-y-5">
              <h3 className="text-lg font-bold">Faixa de preço</h3>
              <Slider
                value={range}
                onValueChange={setRange}
                min={2}
                max={1230}
                step={1}
                thumbLabels={['Preço mínimo', 'Preço máximo']}
              />
              <p className="text-15" aria-live="polite">
                Preço: {formattedRange.join(' - ')} ETH
              </p>
              <Button size="sm">Aplicar</Button>
              <Slider
                defaultValue={[2, 1230]}
                min={2}
                max={1230}
                disabled
                thumbLabels={['Preço mínimo indisponível', 'Preço máximo indisponível']}
              />
            </div>
          </section>

          <section id="navegacao" className={sectionClass} aria-labelledby="navegacao-title">
            <h2 id="navegacao-title" className={headingClass}>
              Navegação
            </h2>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#navegacao">Início</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="#navegacao">Mercado</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Carrinho</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="mt-4">
              <Breadcrumb aria-label="Caminho de navegação reduzido">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#navegacao">Início</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbEllipsis />
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Carrinho</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <Tabs defaultValue="all" className="mt-8">
              <TabsList aria-label="Categorias de NFTs">
                <TabsTrigger value="all">Todos os NFTs</TabsTrigger>
                <TabsTrigger value="new">Novos lançamentos</TabsTrigger>
                <TabsTrigger value="trending">Em alta</TabsTrigger>
                <TabsTrigger value="soon" disabled>
                  Em breve
                </TabsTrigger>
              </TabsList>
              <TabsContent value="all">Todos os NFTs</TabsContent>
              <TabsContent value="new">Novos lançamentos</TabsContent>
              <TabsContent value="trending">Em alta</TabsContent>
            </Tabs>
            <Tabs defaultValue="details" className="mt-8">
              <TabsList variant="line" aria-label="Informações do NFT">
                <TabsTrigger value="details">Detalhes do NFT</TabsTrigger>
                <TabsTrigger value="reviews">Avaliações</TabsTrigger>
              </TabsList>
              <TabsContent value="details">
                <p className="text-sand">Detalhes do NFT</p>
              </TabsContent>
              <TabsContent value="reviews">
                <p className="text-sand">Avaliações</p>
              </TabsContent>
            </Tabs>
            <div id="paginacao" className="mt-8">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#paginacao"
                      aria-disabled={page === 1}
                      onClick={(event) => {
                        event.preventDefault()
                        setPage(Math.max(1, page - 1))
                      }}
                    />
                  </PaginationItem>
                  {[1, 2, 3, 4].map((number) => (
                    <PaginationItem key={number}>
                      <PaginationLink
                        href="#paginacao"
                        isActive={page === number}
                        aria-label={`Página ${number}`}
                        onClick={(event) => {
                          event.preventDefault()
                          setPage(number)
                        }}
                      >
                        {number}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#paginacao"
                      aria-disabled={page === 4}
                      onClick={(event) => {
                        event.preventDefault()
                        setPage(Math.min(4, page + 1))
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              <p className="mt-3 text-center text-xs text-sand" aria-live="polite">
                Página {page}
              </p>
            </div>
            <Separator className="my-8" />
            <div className="flex h-8 items-center gap-6">
              <span>Início</span>
              <Separator orientation="vertical" />
              <span>Mercado</span>
            </div>
          </section>

          <section id="feedback" className={sectionClass} aria-labelledby="feedback-title">
            <h2 id="feedback-title" className={headingClass}>
              Feedback
            </h2>
            <div className="flex flex-wrap items-center gap-4">
              <Badge>Ethereum</Badge>
              <Badge variant="count">6</Badge>
              <Badge variant="rare">RARO</Badge>
              <Badge variant="outline">METAMASK • WALLETCONNECT • COINBASE</Badge>
              <Badge variant="secondary">Polygon</Badge>
              <Badge variant="destructive">Erro</Badge>
              <Badge asChild>
                <a href="#feedback">Explorar</a>
              </Badge>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Avatar size="sm">
                <AvatarFallback>KU</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarImage src="/favicon.svg" alt="Marca Kurio" />
                <AvatarFallback>KU</AvatarFallback>
              </Avatar>
              <Avatar size="lg">
                <AvatarFallback>KU</AvatarFallback>
                <AvatarBadge />
              </Avatar>
              <AvatarGroup>
                <Avatar>
                  <AvatarFallback>KU</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>AR</AvatarFallback>
                </Avatar>
                <AvatarGroupCount>+3</AvatarGroupCount>
              </AvatarGroup>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <Alert>
                <Icons.InfoIcon />
                <AlertTitle>Taxa estimada</AlertTitle>
                <AlertDescription>A taxa de rede pode variar.</AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <Icons.AlertIcon />
                <AlertTitle>Revise os dados</AlertTitle>
                <AlertDescription>Informe um e-mail válido.</AlertDescription>
              </Alert>
              <Alert variant="success">
                <Icons.CheckIcon />
                <AlertTitle>Componente de confirmação</AlertTitle>
                <AlertDescription>Exemplo visual do estado de sucesso.</AlertDescription>
              </Alert>
            </div>
            <h3 className="mt-8 mb-4 text-lg font-bold">Carregamento</h3>
            <div
              role="status"
              aria-label="Carregando conteúdo"
              className="flex max-w-md flex-col gap-4"
            >
              <Skeleton className="h-[300px] w-[258px] max-w-full rounded-2xl" />
              <div className="flex items-center gap-4">
                <Skeleton variant="circle" className="size-10" />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="line" className="w-4/5" />
                  <Skeleton variant="line" className="w-1/2" />
                </div>
              </div>
              <span className="sr-only">Carregando conteúdo</span>
            </div>
            <h3 className="mt-8 mb-4 text-lg font-bold">Notificações</h3>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  toast.success('Exemplo de sucesso', {
                    description: 'Demonstração da notificação.',
                  })
                }
              >
                Sucesso
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  toast.error('Exemplo de erro', { description: 'Demonstração da notificação.' })
                }
              >
                Erro
              </Button>
              <Button variant="outline" onClick={explain}>
                Informação
              </Button>
              <Button variant="outline" onClick={() => toast.warning('Taxa estimada')}>
                Aviso
              </Button>
              <Button
                variant="outline"
                onClick={() => toast.loading('Carregando', { duration: 2000 })}
              >
                Carregando
              </Button>
            </div>
          </section>

          <section
            id="sobreposicoes"
            className={sectionClass}
            aria-labelledby="sobreposicoes-title"
          >
            <h2 id="sobreposicoes-title" className={headingClass}>
              Sobreposições
            </h2>
            <div className="flex flex-wrap gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Entrar</Button>
                </DialogTrigger>
                <DialogContent className="min-h-[600px] content-start gap-0 px-0 pt-12 pb-16">
                  <DialogHeader className="gap-8 px-8 text-center sm:text-center">
                    <DialogTitle>
                      <span className="text-amber">Entrar</span>
                      <span aria-hidden="true" className="mx-2 border-r border-coral" />
                      Criar conta
                    </DialogTitle>
                    <DialogDescription className="text-cream">
                      Entre para gerenciar sua carteira, coleção e perfil de criador.
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    className="mx-auto mt-6 w-[calc(100%-3rem)] max-w-[340px] space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault()
                      explain()
                    }}
                  >
                    <Label htmlFor="modal-email" className="sr-only">
                      E-mail
                    </Label>
                    <Input
                      id="modal-email"
                      type="email"
                      placeholder="contato@email.com"
                      autoComplete="email"
                    />
                    <Label htmlFor="modal-password" className="sr-only">
                      Senha
                    </Label>
                    <PasswordInput
                      id="modal-password"
                      autoComplete="current-password"
                      defaultValue="kurio-exemplo"
                      className="border-copper"
                    />
                    <div className="py-0.5 text-right">
                      <Button variant="link" className="text-sm" onClick={explain}>
                        Esqueceu a senha?
                      </Button>
                    </div>
                    <Button type="submit" size="lg" className="w-full">
                      Entrar
                    </Button>
                  </form>
                  <div className="mt-6 flex items-center gap-3">
                    <Separator className="w-auto flex-1" />
                    <span className="text-13 leading-4">Ou continue com</span>
                    <Separator className="w-auto flex-1" />
                  </div>
                  <div className="mx-auto mt-3 w-[calc(100%-3rem)] max-w-[340px] space-y-3">
                    <Button variant="social" className="w-full" onClick={explain}>
                      <Icons.GoogleIcon />
                      Continuar com Google
                    </Button>
                    <Button variant="social" className="w-full" onClick={explain}>
                      <Icons.FacebookBrandIcon />
                      Continuar com Facebook
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Confirmação</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <Icons.ThankYouIcon className="mx-auto" />
                    <DialogTitle className="text-center">Pedido confirmado</DialogTitle>
                    <DialogDescription className="text-center">
                      Demonstração do painel de confirmação.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button>Continuar explorando</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {(['left', 'right', 'top', 'bottom'] as const).map((side) => (
                <Sheet key={side}>
                  <SheetTrigger asChild>
                    <Button variant="outline">
                      Painel:{' '}
                      {
                        { left: 'esquerda', right: 'direita', top: 'topo', bottom: 'inferior' }[
                          side
                        ]
                      }
                    </Button>
                  </SheetTrigger>
                  <SheetContent side={side}>
                    <SheetHeader>
                      <SheetTitle>Coleções</SheetTitle>
                      <SheetDescription>Refine sua busca no mercado.</SheetDescription>
                    </SheetHeader>
                    <div className="px-6">
                      <Label htmlFor={`sheet-search-${side}`}>Explorar coleções</Label>
                      <Input
                        id={`sheet-search-${side}`}
                        className="mt-2"
                        placeholder="Explorar coleções"
                      />
                    </div>
                    <SheetFooter>
                      <SheetClose asChild>
                        <Button>Aplicar</Button>
                      </SheetClose>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Meu perfil
                    <Icons.ArrowDown2Icon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64">
                  <DropdownMenuLabel>Meu perfil</DropdownMenuLabel>
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={explain}>
                      <Icons.UserIcon />
                      Dados do perfil<DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                      <Icons.WalletIcon />
                      Em breve
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem checked={showRare} onCheckedChange={setShowRare}>
                    RARO
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Rede</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup value={network} onValueChange={setNetwork}>
                        <DropdownMenuRadioItem value="ethereum">Ethereum</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="polygon">Polygon</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={explain}>
                    <Icons.LogoutIcon />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="icon" aria-label="Informações sobre a taxa">
                    <Icons.InfoIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Taxa estimada</TooltipContent>
              </Tooltip>
            </div>
          </section>

          <section id="icones" className={sectionClass} aria-labelledby="icones-title">
            <h2 id="icones-title" className={headingClass}>
              Ícones
            </h2>
            <p className="mb-6 text-sm text-sand">
              Traçados do Figma. Google e Facebook preservam as cores de marca.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {iconEntries.map(([name, Icon]) => (
                <div
                  key={name}
                  data-icon-name={name}
                  className="flex min-h-24 min-w-0 flex-col items-center justify-center gap-3 rounded-lg border border-line bg-surface p-3 text-copper"
                >
                  <Icon size={24} title={name} />
                  <span className="max-w-full text-center text-10 leading-4 break-all text-sand">
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section id="shell" className={sectionClass} aria-labelledby="shell-title">
            <h2 id="shell-title" className={headingClass}>
              Shell responsivo
            </h2>
            <div className="hidden border border-line md:block">
              <SiteHeader
                activeNav="mercado"
                navigationLabel="Navegação principal — exemplo autenticado"
                cartCount={6}
                divider
                user={{ displayName: 'Colecionador' }}
                onSearch={explain}
                onLogout={explain}
              />
            </div>
            <div className="mt-8 grid gap-8 xl:grid-cols-2">
              <div className="mx-auto w-full max-w-[414px] rounded-3xl border border-line bg-ink pb-6">
                <MobileTopBar
                  variant="home"
                  searchLabel="Buscar coleções — exemplo"
                  onFilter={() => setFilterOpen(true)}
                  onSearchSubmit={explain}
                />
              </div>
              <div className="mx-auto w-full max-w-[414px] rounded-3xl border border-line bg-ink pb-6">
                <MobileTopBar
                  variant="inner"
                  title="Carrinho de NFTs"
                  rightAction={
                    <Button variant="ghost" size="icon" aria-label="Favoritar">
                      <Icons.HeartIcon />
                    </Button>
                  }
                />
              </div>
            </div>
            <div className="mx-auto mt-12 w-full max-w-[414px]">
              <MobileTabBar
                className="relative"
                navigationLabel="Navegação móvel — exemplo"
                activeTab="favoritos"
                cartCount={6}
                onAction={explain}
              />
            </div>
            <div className="mt-8 md:hidden">
              <SiteFooter className="px-0" onNewsletterSubmit={explain} />
            </div>
          </section>
        </div>
      </PageShell>
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Coleções</SheetTitle>
            <SheetDescription>Faixa de preço</SheetDescription>
          </SheetHeader>
          <div className="space-y-5 px-6">
            <Slider value={range} onValueChange={setRange} min={2} max={1230} />
            <p>Preço: {formattedRange.join(' - ')} ETH</p>
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button>Aplicar</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <Toaster />
    </TooltipProvider>
  )
}
