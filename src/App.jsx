import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Gift, X, Copy, CheckCircle, HeartHandshake, Coins, QrCode, PartyPopper } from 'lucide-react'
import { tailspin } from 'ldrs'
import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion' // Biblioteca de animações

// Importando a foto do casal
import imagemCasal from './assets/imagem_casal.jpeg'

// Registra o componente visual de loading
tailspin.register()

export default function App() {
  // ==========================================
  // 1. ESTADOS (STATE) DO APLICATIVO
  // ==========================================
  
  // Dados principais
  const [itens, setItens] = useState([]) // Guarda a lista de presentes que vem do banco
  const [loading, setLoading] = useState(true) // Controla a tela de carregamento inicial
  
  // Controle do Modal (janelinha pop-up)
  const [modalAberto, setModalAberto] = useState(false) // Diz se o modal está visível ou não
  const [itemSelecionado, setItemSelecionado] = useState(null) // Guarda qual presente foi clicado
  const [etapaModal, setEtapaModal] = useState('formulario') // Controla a tela interna do modal ('formulario', 'pix' ou 'sucesso')
  
  // Dados do formulário de pagamento
  const [nome, setNome] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [valor, setValor] = useState('')

  // Estados do PIX
  const [carregandoPix, setCarregandoPix] = useState(false) // Trava o botão enquanto o Mercado Pago gera o código
  const [copiado, setCopiado] = useState(false) // Efeito visual de "Copiado!" no botão
  const [pixReal, setPixReal] = useState('') // O código "Copia e Cola" do PIX
  const [qrCodeImg, setQrCodeImg] = useState('') // A imagem Base64 do QR Code
  
  // Estado para ouvir a transação em tempo real (WebSocket)
  const [idTransacaoAtual, setIdTransacaoAtual] = useState(null)

  // Filtros de Categoria
  const [filtroAtual, setFiltroAtual] = useState('Todos')
  const categorias = ['Todos', 'Sala', 'Quarto', 'Cozinha', 'Banheiro', 'Lavanderia', 'Eletrodomésticos']

  // ==========================================
  // 2. FUNÇÕES E EFEITOS (USEEFFECT)
  // ==========================================

  // Função que busca os produtos na tabela 'itens' lá no Supabase
  const carregarItens = async () => {
    const { data, error } = await supabase
      .from('itens')
      .select('*')
      .order('created_at', { ascending: false }) // Traz os mais recentes primeiro
    
    if (error) console.error('Erro ao buscar presentes:', error)
    else setItens(data)
    
    setLoading(false) // Tira a tela de carregamento
  }

  // Roda uma única vez quando o site abre para carregar a vitrine
  useEffect(() => {
    carregarItens()
  }, [])

  // Trava a rolagem da tela de fundo quando o modal do PIX estiver aberto
  useEffect(() => {
    if (modalAberto) document.body.classList.add('modal-aberto')
    else document.body.classList.remove('modal-aberto')
  }, [modalAberto])

  // EFEITO DE TEMPO REAL: Fica "escutando" o banco de dados
  useEffect(() => {
    // Só abre a escuta se o usuário estiver na tela do PIX aguardando pagamento
    if (etapaModal === 'pix' && idTransacaoAtual) {
      const channel = supabase
        .channel(`transacao_${idTransacaoAtual}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE', // Só reage quando a linha for ATUALIZADA
            schema: 'public',
            table: 'transacoes',
            filter: `id=eq.${idTransacaoAtual}` // Só escuta a transação exata deste usuário
          },
          (payload) => {
            // Se o Webhook mudou o status para 'aprovado', dispara a festa!
            if (payload.new.status_pagamento === 'aprovado') {
              confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#10b981', '#14b8a6', '#fcd34d', '#3b82f6'],
                zIndex: 99999 // Força o confete a aparecer na frente de tudo
              })
              setEtapaModal('sucesso') // Muda para a tela de agradecimento
              carregarItens() // Atualiza os itens por baixo dos panos para a barra de progresso subir
            }
          }
        )
        .subscribe()

      // Função de limpeza: desliga o rádio se a pessoa fechar o modal
      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [etapaModal, idTransacaoAtual])

  // ==========================================
  // 3. AÇÕES DO USUÁRIO
  // ==========================================

  const abrirModal = (item) => {
    setItemSelecionado(item)
    setModalAberto(true)
    setEtapaModal('formulario')
    setIdTransacaoAtual(null)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setItemSelecionado(null)
    // Limpa todos os campos para a próxima vez
    setNome('')
    setMensagem('')
    setValor('')
    setCopiado(false)
    setIdTransacaoAtual(null)
  }

  // Disparada quando o usuário clica em "Gerar PIX"
  const lidarComPagamento = async (e) => {
    e.preventDefault() // Evita que a página recarregue
    setCarregandoPix(true)

    try {
      // 1. Chama a Edge Function do Supabase que conversa com o Mercado Pago
      const { data: pixData, error: pixError } = await supabase.functions.invoke('gerar-pix', {
        body: { 
          valor: valor, 
          descricao: `Presente: ${itemSelecionado.nome}`,
          nome: nome 
        }
      })

      if (pixError) throw pixError

      // 2. Salva o "recibo pendente" no banco de dados e retorna o ID criado (.select().single())
      const { data: dbData, error: dbError } = await supabase
        .from('transacoes')
        .insert([{
          item_id: itemSelecionado.id,
          nome_doador: nome,
          mensagem: mensagem,
          valor_pago: parseFloat(valor),
          status_pagamento: 'pendente',
          id_mercado_pago: String(pixData.id_transacao_mp)
        }])
        .select()
        .single()

      if (dbError) throw dbError

      // 3. Atualiza as telas com os dados reais gerados
      setPixReal(pixData.pix_copia_e_cola)
      setQrCodeImg(`data:image/jpeg;base64,${pixData.qr_code_base64}`)
      setIdTransacaoAtual(dbData.id) // Guarda o ID para o efeito WebSocket escutar
      
      setCarregandoPix(false)
      setEtapaModal('pix') // Avança para a tela do QR Code

    } catch (error) {
      console.error('Erro geral:', error)
      alert('Deu erro ao gerar o PIX. Tente novamente.')
      setCarregandoPix(false)
    }
  }

  const copiarPix = () => {
    navigator.clipboard.writeText(pixReal)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 3000) // Volta ao normal após 3 segundos
  }

  // Filtra a lista de itens baseado no botão de cômodo clicado
  const itensFiltrados = itens.filter(item => {
    if (filtroAtual === 'Todos') return true
    return item.categoria?.toLowerCase() === filtroAtual.toLowerCase()
  })

  // ==========================================
  // 4. CONFIGURAÇÕES DO FRAMER MOTION (ANIMAÇÕES)
  // ==========================================

  // Animação do Container dos cards (faz eles aparecerem um após o outro)
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 } // Atrasa a entrada de cada filho em 0.1s
    }
  }

  // Animação individual de cada Card (surge de baixo para cima com efeito de mola)
  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
  }

  // ==========================================
  // 5. RENDERIZAÇÃO DA TELA (HTML/JSX)
  // ==========================================

  // Tela de Loading inicial
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6 font-sans">
        <l-tailspin size="45" stroke="4" speed="0.9" color="#10b981"></l-tailspin>
        <p className="text-slate-500 font-medium tracking-wide animate-pulse">Preparando a lista de presentes...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 font-sans relative selection:bg-emerald-200 overflow-hidden">
      
      {/* BACKGROUND COM BOLHAS DESFOCADAS ANIMADAS */}
      <div className="fixed inset-0 w-full h-full pointer-events-none -z-10 bg-slate-50">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 sm:w-[500px] sm:h-[500px] rounded-full bg-emerald-200/50 mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-96 h-96 sm:w-[500px] sm:h-[500px] rounded-full bg-teal-200/50 mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 sm:w-[600px] sm:h-[600px] rounded-full bg-green-100/50 mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-16">
        
        {/* CABEÇALHO */}
        <header className="mb-16 text-center flex flex-col items-center pt-6">
          {/* Foto Levitando */}
          <motion.div 
            animate={{ y: [0, -10, 0] }} // Sobe -10px e volta pra zero
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} // Loop infinito
            className="relative -mb-10 md:-mb-14 group z-0"
          >
            <div className="absolute inset-0 bg-emerald-200 rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>
            <img 
              src={imagemCasal} 
              alt="Heron e Malu" 
              className="relative w-64 h-64 md:w-80 md:h-80 object-cover rounded-full shadow-2xl border-4 md:border-8 border-white"
            />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="relative font-serif text-4xl sm:text-5xl md:text-[5.5rem] font-bold text-slate-800 mb-6 tracking-tight z-20 leading-none pt-4 drop-shadow-sm whitespace-nowrap"
          >
            Heron <span className="text-emerald-500 font-light italic">&</span> Malu
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="relative text-slate-600 max-w-2xl mx-auto text-lg leading-relaxed z-10 px-4"
          >
            Ajude-nos a construir nosso novo lar. Todo valor é muito bem-vindo e fará parte da nossa história!
          </motion.p>
        </header>

        {/* BOTÕES DE FILTRO */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-10 flex overflow-x-auto gap-3 pb-4 snap-x hide-scrollbar sm:justify-center px-2"
        >
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setFiltroAtual(cat)}
              className={`snap-start whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 cursor-pointer active:scale-95 ${
                filtroAtual === cat 
                ? 'bg-slate-800 text-white shadow-md scale-105' 
                : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </motion.div>

        {/* VITRINE DE PRESENTES */}
        {itensFiltrados.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Gift className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Nenhum item adicionado nesta categoria ainda.</p>
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            key={filtroAtual} // A propriedade 'key' força a animação a rodar de novo quando a categoria muda
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8"
          >
            {itensFiltrados.map((item) => {
              // Calcula a porcentagem para a barra verde. O Math.min garante que não passe de 100% visualmente
              const porcentagem = Math.min((item.valor_arrecadado / item.valor_meta) * 100, 100).toFixed(1)
              
              return (
                <motion.div 
                  variants={itemVariants}
                  key={item.id} 
                  className="group bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100/50 overflow-hidden transition-all duration-500 flex flex-col hover:shadow-2xl hover:shadow-emerald-900/10 active:scale-[0.98]"
                >
                  {/* Foto do Produto */}
                  <div className="h-36 sm:h-48 lg:h-56 overflow-hidden bg-slate-100 relative">
                    {item.imagem_url ? (
                      <img 
                        src={item.imagem_url} 
                        alt={item.nome} 
                        className="w-full h-full object-cover transition-transform duration-1000 ease-in-out group-hover:scale-110" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Gift className="w-8 h-8 sm:w-12 sm:h-12 text-slate-300" />
                      </div>
                    )}
                    {/* Badge de "Atingida" caso tenha batido a meta */}
                    {porcentagem >= 100 && (
                      <motion.div 
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-emerald-500 text-white text-[10px] sm:text-xs font-bold px-2 py-1 sm:px-3 rounded-full shadow-lg"
                      >
                        Atingida!
                      </motion.div>
                    )}
                  </div>
                  
                  {/* Textos do Card */}
                  <div className="p-4 sm:p-6 md:p-8 flex flex-col flex-1">
                    <h3 className="font-serif text-lg sm:text-xl md:text-2xl font-bold text-slate-800 mb-2 leading-tight">
                      {item.nome}
                    </h3>
                    
                    {/* Essa mt-auto empurra esse bloco sempre para o fundo do card */}
                    <div className="mt-auto w-full pt-4">
                      <div className="space-y-3 mb-6">
                        
                        <div className="flex justify-between items-end gap-2">
                          <div className="text-left">
                            <p className="text-[10px] sm:text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">Arrecadado</p>
                            <span className="font-bold text-sm sm:text-lg text-slate-800">
                              R$ {item.valor_arrecadado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-[10px] sm:text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">Meta</p>
                            <span className="text-xs sm:text-sm text-slate-500 font-medium">
                              R$ {item.valor_meta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                        
                        {/* Barra de Progresso Animada */}
                        <div className="w-full bg-slate-100 rounded-full h-1.5 sm:h-2.5 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${porcentagem}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full rounded-full relative"
                          >
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                          </motion.div>
                        </div>

                      </div>

                      {/* Botão de Presentear */}
                      <button 
                        onClick={() => abrirModal(item)}
                        className="relative w-full inline-flex h-10 sm:h-14 items-center justify-center overflow-hidden rounded-xl sm:rounded-2xl bg-slate-900 text-white text-xs sm:text-base font-medium shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <span className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0),45%,rgba(255,255,255,0.15),55%,rgba(255,255,255,0))] bg-[length:200%_100%] animate-shimmer"></span>
                        <span className="relative flex items-center gap-1.5 sm:gap-2">
                          <Gift className="w-3 h-3 sm:w-4 sm:h-4" />
                          Presentear
                        </span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>

      {/* ========================================== */}
      {/* 6. MODAL DE PAGAMENTO (OVERLAY) */}
      {/* ========================================== */}
      
      {/* O AnimatePresence avisa o Framer Motion quando um componente vai ser removido da tela para rodar a animação de saída (exit) */}
      <AnimatePresence>
        {modalAberto && itemSelecionado && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm sm:p-4"
          >
            <motion.div 
              initial={{ y: "100%", opacity: 0 }} // Começa abaixo da tela
              animate={{ y: 0, opacity: 1 }}      // Desliza pro centro
              exit={{ y: "100%", opacity: 0 }}    // Desliza de volta pra baixo ao fechar
              transition={{ type: "spring", damping: 25, stiffness: 200 }} // Efeito de elástico/mola
              className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl relative flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()} // Impede que clicar dentro do modal feche ele
            >
              
              {/* Tracinho de arrastar em cima do modal (Só aparece no mobile) */}
              <div className="w-full flex justify-center pt-4 pb-2 sm:hidden">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
              </div>

              {/* Botão de Fechar */}
              <button 
                onClick={fecharModal}
                className="absolute top-4 sm:top-6 right-4 sm:right-6 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer bg-slate-100 hover:bg-slate-200 p-2 rounded-full active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* CONTEÚDO DINÂMICO DO MODAL */}
              <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
                
                {/* TELA 1: FORMULÁRIO */}
                {etapaModal === 'formulario' && (
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <h2 className="font-serif text-3xl font-bold text-slate-800 mb-2">Colaborador</h2>
                    <p className="text-slate-600 mb-8 text-sm">Ajudando na compra de: <strong className="text-slate-800 font-semibold">{itemSelecionado.nome}</strong></p>

                    <form onSubmit={lidarComPagamento} className="space-y-5">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Como devemos te chamar?</label>
                        <input 
                          type="text" 
                          required
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                          placeholder="Seu nome ou apelido"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Mensagem <span className="text-slate-400 font-normal">(Opcional)</span></label>
                        <textarea 
                          value={mensagem}
                          onChange={(e) => setMensagem(e.target.value)}
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all resize-none"
                          placeholder="Deixe um recado especial para os noivos..."
                          rows="3"
                        ></textarea>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Valor da Ajuda (R$)</label>
                        <input 
                          type="number" 
                          required
                          min="1"
                          step="0.01"
                          value={valor}
                          onChange={(e) => setValor(e.target.value)}
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-xl font-bold text-slate-800"
                          placeholder="0,00"
                        />
                      </div>

                      <button 
                        type="submit"
                        disabled={carregandoPix}
                        className="relative w-full mt-6 inline-flex h-14 items-center justify-center overflow-hidden rounded-2xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-600 active:scale-95 disabled:opacity-70 disabled:scale-100 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {carregandoPix ? (
                           <l-tailspin size="24" stroke="3" speed="0.9" color="white"></l-tailspin>
                        ) : (
                          <>
                            <span className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0),45%,rgba(255,255,255,0.2),55%,rgba(255,255,255,0))] bg-[length:200%_100%] animate-shimmer"></span>
                            <span className="relative">Gerar PIX Copia e Cola</span>
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}

                {/* TELA 2: AGUARDANDO PAGAMENTO DO PIX */}
                {etapaModal === 'pix' && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center pt-2 pb-6">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <l-tailspin size="30" stroke="3" speed="0.9" color="#10b981"></l-tailspin>
                    </div>
                    <h2 className="font-serif text-3xl font-bold text-slate-800 mb-3">Aguardando Pagamento</h2>
                    <p className="text-slate-600 mb-8 leading-relaxed">Escaneie o QR Code ou copie o código abaixo para pagar direto no app do seu banco.</p>
                    
                    <div className="bg-white border-2 border-slate-100 p-4 rounded-3xl mb-8 shadow-sm">
                      <img src={qrCodeImg} alt="QR Code PIX" className="w-48 h-48 mix-blend-multiply" />
                    </div>

                    <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 relative group">
                      <p className="text-xs text-slate-500 truncate font-mono select-all pr-8">
                        {pixReal}
                      </p>
                    </div>

                    <button 
                      onClick={copiarPix}
                      className={`w-full h-14 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95 ${
                        copiado 
                        ? 'bg-slate-800 text-white' 
                        : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-emerald-500/30'
                      }`}
                    >
                      {copiado ? (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Código Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-5 h-5" />
                          Copiar Código PIX
                        </>
                      )}
                    </button>
                    
                    <p className="text-xs text-emerald-600 font-semibold mt-6 uppercase tracking-wider animate-pulse">
                      Esta tela atualizará sozinha
                    </p>
                  </motion.div>
                )}

                {/* TELA 3: SUCESSO (PIX CONFIRMADO) */}
                {etapaModal === 'sucesso' && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", bounce: 0.5 }} className="flex flex-col items-center text-center pt-10 pb-8">
                    <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                      <PartyPopper className="w-12 h-12 text-emerald-500" />
                    </div>
                    <h2 className="font-serif text-4xl font-bold text-slate-800 mb-4">Muuuuito Obrigado!</h2>
                    <p className="text-slate-600 mb-8 leading-relaxed text-lg">
                      Seu PIX foi confirmado. <strong className="text-emerald-600">{nome}</strong>, você acabou de nos ajudar a chegar mais perto do nosso sonho.
                    </p>
                    
                    <button 
                      onClick={fecharModal}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-colors cursor-pointer active:scale-95"
                    >
                      Voltar para a Lista
                    </button>
                  </motion.div>
                )}

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}