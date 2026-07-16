import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Gift, X, Copy, CheckCircle, HeartHandshake, Coins, QrCode, PartyPopper } from 'lucide-react'
import { tailspin } from 'ldrs'
import confetti from 'canvas-confetti'

// Importando a foto 
import imagemCasal from './assets/imagem_casal.jpeg'

tailspin.register()

export default function App() {
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [modalAberto, setModalAberto] = useState(false)
  const [itemSelecionado, setItemSelecionado] = useState(null)
  
  const [nome, setNome] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [valor, setValor] = useState('')

  const [etapaModal, setEtapaModal] = useState('formulario')
  const [carregandoPix, setCarregandoPix] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const [filtroAtual, setFiltroAtual] = useState('Todos')
  const categorias = ['Todos', 'Sala', 'Quarto', 'Cozinha', 'Banheiro', 'Lavanderia', 'Eletrodomésticos']

  const [pixReal, setPixReal] = useState('')
  const [qrCodeImg, setQrCodeImg] = useState('')
  
  // Novo estado para guardar o ID da transação no banco e ouvir as mudanças
  const [idTransacaoAtual, setIdTransacaoAtual] = useState(null)

  const carregarItens = async () => {
    const { data, error } = await supabase
      .from('itens')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) console.error('Erro ao buscar presentes:', error)
    else setItens(data)
    
    setLoading(false)
  }

  useEffect(() => {
    carregarItens()
  }, [])

  useEffect(() => {
    if (modalAberto) document.body.classList.add('modal-aberto')
    else document.body.classList.remove('modal-aberto')
  }, [modalAberto])

  // EFEITO: Escutando o Supabase
  useEffect(() => {
    if (etapaModal === 'pix' && idTransacaoAtual) {
      const channel = supabase
        .channel(`transacao_${idTransacaoAtual}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'transacoes',
            filter: `id=eq.${idTransacaoAtual}`
          },
          (payload) => {
            if (payload.new.status_pagamento === 'aprovado') {
              // Estoura os confetes!
              confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#10b981', '#14b8a6', '#fcd34d', '#3b82f6'],
                zIndex: 99999
              })
              setEtapaModal('sucesso')
              // Recarrega os itens silenciosamente para atualizar a barra de progresso no fundo
              carregarItens()
            }
          }
        )
        .subscribe()

      // Limpa o canal quando o modal fechar ou mudar de tela
      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [etapaModal, idTransacaoAtual])

  const abrirModal = (item) => {
    setItemSelecionado(item)
    setModalAberto(true)
    setEtapaModal('formulario')
    setIdTransacaoAtual(null)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setItemSelecionado(null)
    setNome('')
    setMensagem('')
    setValor('')
    setCopiado(false)
    setIdTransacaoAtual(null)
  }

  const lidarComPagamento = async (e) => {
    e.preventDefault()
    setCarregandoPix(true)

    try {
      const { data: pixData, error: pixError } = await supabase.functions.invoke('gerar-pix', {
        body: { 
          valor: valor, 
          descricao: `Presente: ${itemSelecionado.nome}`,
          nome: nome 
        }
      })

      if (pixError) throw pixError

      // Salva e retorna o registro criado (.select().single())
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

      setPixReal(pixData.pix_copia_e_cola)
      setQrCodeImg(`data:image/jpeg;base64,${pixData.qr_code_base64}`)
      setIdTransacaoAtual(dbData.id) // Guarda o ID para o WebSocket escutar
      
      setCarregandoPix(false)
      setEtapaModal('pix')

    } catch (error) {
      console.error('Erro geral:', error)
      alert('Deu erro ao gerar o PIX. Tente novamente.')
      setCarregandoPix(false)
    }
  }

  const copiarPix = () => {
    navigator.clipboard.writeText(pixReal)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 3000)
  }

  const itensFiltrados = itens.filter(item => {
    if (filtroAtual === 'Todos') return true
    return item.categoria?.toLowerCase() === filtroAtual.toLowerCase()
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6 font-sans">
        <l-tailspin size="45" stroke="4" speed="0.9" color="#10b981"></l-tailspin>
        <p className="text-slate-500 font-medium tracking-wide">Preparando a lista de presentes...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 font-sans relative selection:bg-emerald-200">
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none -z-10 bg-slate-50">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 sm:w-[500px] sm:h-[500px] rounded-full bg-emerald-200/50 mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-96 h-96 sm:w-[500px] sm:h-[500px] rounded-full bg-teal-200/50 mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 sm:w-[600px] sm:h-[600px] rounded-full bg-green-100/50 mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-16">
        
        {/* Cabeçalho com Foto */}
        <header className="mb-16 text-center flex flex-col items-center pt-6">
          
          {/* Container da foto */}
          <div className="relative -mb-10 md:-mb-14 group z-0">
            {/* Glow verde atrás da foto */}
            <div className="absolute inset-0 bg-emerald-200 rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>
            
            <img 
              src={imagemCasal} 
              alt="Heron e Malu" 
              className="relative w-64 h-64 md:w-80 md:h-80 object-cover rounded-full shadow-2xl border-4 md:border-8 border-white"
            />
          </div>
          
          {/* Título. O tamanho no mobile não quebrar a linha */}
          <h1 className="relative font-serif text-4xl sm:text-5xl md:text-[5.5rem] font-bold text-slate-800 mb-6 tracking-tight z-20 leading-none pt-4 drop-shadow-sm whitespace-nowrap">
            Heron <span className="text-emerald-500 font-light italic">&</span> Malu
          </h1>
          
          <p className="relative text-slate-600 max-w-2xl mx-auto text-lg leading-relaxed z-10 px-4">
            Ajude-nos a construir nosso novo lar. Todo valor é muito bem-vindo e fará parte da nossa história!
          </p>
        </header>

        <div className="mb-10 flex overflow-x-auto gap-3 pb-4 snap-x hide-scrollbar sm:justify-center">
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setFiltroAtual(cat)}
              className={`snap-start whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 cursor-pointer ${
                filtroAtual === cat 
                ? 'bg-slate-800 text-white shadow-md scale-105' 
                : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid de Presentes */}
        {itensFiltrados.length === 0 ? (
          <div className="text-center py-20">
            <Gift className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Nenhum item adicionado nesta categoria ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
            {itensFiltrados.map((item) => {
              const porcentagem = Math.min((item.valor_arrecadado / item.valor_meta) * 100, 100).toFixed(1)
              
              return (
                <div 
                  key={item.id} 
                  className="group bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100/50 overflow-hidden hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-900/10 transition-all duration-500 flex flex-col"
                >
                  {/* Container da Imagem */}
                  <div className="h-36 sm:h-48 lg:h-56 overflow-hidden bg-slate-100 relative">
                    {item.imagem_url ? (
                      <img 
                        src={item.imagem_url} 
                        alt={item.nome} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Gift className="w-8 h-8 sm:w-12 sm:h-12 text-slate-300" />
                      </div>
                    )}
                    {porcentagem >= 100 && (
                      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-emerald-500 text-white text-[10px] sm:text-xs font-bold px-2 py-1 sm:px-3 rounded-full shadow-lg">
                        Atingida!
                      </div>
                    )}
                  </div>
                  
                  {/* Container dos Textos e Botão */}
                  <div className="p-4 sm:p-6 md:p-8 flex flex-col flex-1">
                    
                    {/* Título do Presente */}
                    <h3 className="font-serif text-lg sm:text-xl md:text-2xl font-bold text-slate-800 mb-2 leading-tight">
                      {item.nome}
                    </h3>
                    
                    {/* Alinhamento no fundo do card */}
                    <div className="mt-auto w-full pt-4">
                      
                      <div className="space-y-3 mb-6">
                        {/* Valores e Meta */}
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
                        
                        {/* Barra de Progresso */}
                        <div className="w-full bg-slate-100 rounded-full h-1.5 sm:h-2.5 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full rounded-full transition-all duration-1000 ease-out relative"
                            style={{ width: `${porcentagem}%` }}
                          >
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                          </div>
                        </div>
                      </div>

                      {/* Botão */}
                      <button 
                        onClick={() => abrirModal(item)}
                        className="relative w-full inline-flex h-10 sm:h-14 items-center justify-center overflow-hidden rounded-xl sm:rounded-2xl bg-slate-900 text-white text-xs sm:text-base font-medium shadow-md transition-all hover:scale-[1.02] hover:shadow-xl hover:bg-slate-800 active:scale-95 cursor-pointer"
                      >
                        <span className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0),45%,rgba(255,255,255,0.15),55%,rgba(255,255,255,0))] bg-[length:200%_100%] animate-shimmer"></span>
                        <span className="relative flex items-center gap-1.5 sm:gap-2">
                          <Gift className="w-3 h-3 sm:w-4 sm:h-4" />
                          Presentear
                        </span>
                      </button>
                    </div>
                    
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modalAberto && itemSelecionado && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm sm:p-4 transition-opacity">
          <div 
            className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl relative flex flex-col max-h-[90vh] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-center pt-4 pb-2 sm:hidden">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>

            <button 
              onClick={fecharModal}
              className="absolute top-4 sm:top-6 right-4 sm:right-6 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer bg-slate-100 hover:bg-slate-200 p-2 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
              {etapaModal === 'formulario' && (
                <div>
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
                      className="relative w-full mt-6 inline-flex h-14 items-center justify-center overflow-hidden rounded-2xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/30 transition-all hover:scale-[1.02] hover:bg-emerald-600 disabled:opacity-70 disabled:scale-100 disabled:cursor-not-allowed cursor-pointer"
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
                </div>
              )}

              {etapaModal === 'pix' && (
                <div className="flex flex-col items-center text-center pt-2 pb-6">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <l-tailspin size="30" stroke="3" speed="0.9" color="#10b981"></l-tailspin>
                  </div>
                  <h2 className="font-serif text-3xl font-bold text-slate-800 mb-3">Aguardando Pagamento</h2>
                  <p className="text-slate-600 mb-8 leading-relaxed">Escaneie o QR Code ou copie o código abaixo para pagar.</p>
                  
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
                    className={`w-full h-14 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                      copiado 
                      ? 'bg-slate-800 text-white scale-[0.98]' 
                      : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-[1.02] hover:shadow-emerald-500/30'
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
                </div>
              )}

              {etapaModal === 'sucesso' && (
                <div className="flex flex-col items-center text-center pt-10 pb-8 animate-in fade-in zoom-in duration-500">
                  <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                    <PartyPopper className="w-12 h-12 text-emerald-500" />
                  </div>
                  <h2 className="font-serif text-4xl font-bold text-slate-800 mb-4">Muuuuito Obrigado!</h2>
                  <p className="text-slate-600 mb-8 leading-relaxed text-lg">
                    Seu PIX foi confirmado. <strong className="text-emerald-600">{nome}</strong>, você acabou de nos ajudar a chegar mais perto do nosso sonho.
                  </p>
                  
                  <button 
                    onClick={fecharModal}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-colors cursor-pointer"
                  >
                    Voltar para a Lista
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}