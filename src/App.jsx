import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Gift, X, Copy, CheckCircle } from 'lucide-react'
import { tailspin } from 'ldrs'

// Registra o componente de loading animado
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

  const pixCopiaECola = "00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540510.005802BR5913Heron e Malu6008BRASILIA62070503***63041A2B"

  useEffect(() => {
    async function carregarItens() {
      const { data, error } = await supabase
        .from('itens')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) console.error('Erro ao buscar presentes:', error)
      else setItens(data)
      
      setLoading(false)
    }
    carregarItens()
  }, [])

  // Gerencia a classe no body para travar o scroll mobile
  useEffect(() => {
    if (modalAberto) document.body.classList.add('modal-aberto')
    else document.body.classList.remove('modal-aberto')
  }, [modalAberto])

  const abrirModal = (item) => {
    setItemSelecionado(item)
    setModalAberto(true)
    setEtapaModal('formulario')
  }

  const fecharModal = () => {
    setModalAberto(false)
    setItemSelecionado(null)
    setNome('')
    setMensagem('')
    setValor('')
    setCopiado(false)
  }

  const lidarComPagamento = async (e) => {
    e.preventDefault()
    setCarregandoPix(true)

    const { error } = await supabase
      .from('transacoes')
      .insert([{
        item_id: itemSelecionado.id,
        nome_doador: nome,
        mensagem: mensagem,
        valor_pago: parseFloat(valor),
        status_pagamento: 'pendente'
      }])

    if (error) {
      alert('Ocorreu um erro. Tente novamente.')
      setCarregandoPix(false)
      return
    }

    setTimeout(() => {
      setCarregandoPix(false)
      setEtapaModal('pix')
    }, 1500)
  }

  const copiarPix = () => {
    navigator.clipboard.writeText(pixCopiaECola)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 3000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6 font-sans">
        <l-tailspin size="45" stroke="4" speed="0.9" color="#10b981"></l-tailspin>
        <p className="text-slate-500 font-medium tracking-wide">Preparando a lista de presentes...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans relative selection:bg-emerald-200">
      
      {/* Background Decorativo Suave */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-emerald-50 to-[#F8FAFC] -z-10"></div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        <header className="mb-16 text-center">
          <h1 className="font-serif text-5xl md:text-7xl font-bold text-slate-800 mb-6 tracking-tight">
            Heron <span className="text-emerald-500 font-light italic">&</span> Malu
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg leading-relaxed">
            Ajude-nos a construir nosso novo lar. Escolha um item abaixo e contribua com o valor que desejar. Cada ajuda faz a diferença!
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {itens.map((item) => {
            const porcentagem = Math.min((item.valor_arrecadado / item.valor_meta) * 100, 100).toFixed(1)
            
            return (
              <div 
                key={item.id} 
                className="group bg-white rounded-3xl shadow-sm border border-slate-100/50 overflow-hidden hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-900/10 transition-all duration-500 flex flex-col"
              >
                <div className="h-56 overflow-hidden bg-slate-100 relative">
                  {item.imagem_url ? (
                    <img 
                      src={item.imagem_url} 
                      alt={item.nome} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Gift className="w-12 h-12 text-slate-300" />
                    </div>
                  )}
                  {/* Etiqueta de status da meta */}
                  {porcentagem >= 100 && (
                    <div className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      Meta Atingida!
                    </div>
                  )}
                </div>
                
                <div className="p-6 md:p-8 flex flex-col flex-1">
                  <h3 className="font-serif text-2xl font-bold text-slate-800 mb-2 leading-tight">{item.nome}</h3>
                  <p className="text-sm text-slate-500 mb-8 line-clamp-2 leading-relaxed flex-1">{item.descricao}</p>
                  
                  <div className="space-y-3 mb-8">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Arrecadado</p>
                        <span className="font-bold text-lg text-slate-800">
                          R$ {item.valor_arrecadado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Meta</p>
                        <span className="text-slate-500 font-medium">
                          R$ {item.valor_meta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full rounded-full transition-all duration-1000 ease-out relative"
                        style={{ width: `${porcentagem}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {/* Botão Animado estilo Uiverse */}
                  <button 
                    onClick={() => abrirModal(item)}
                    className="relative w-full inline-flex h-14 items-center justify-center overflow-hidden rounded-2xl bg-slate-900 text-white font-medium shadow-md transition-all hover:scale-[1.02] hover:shadow-xl hover:bg-slate-800 active:scale-95 cursor-pointer"
                  >
                    <span className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0),45%,rgba(255,255,255,0.15),55%,rgba(255,255,255,0))] bg-[length:200%_100%] animate-shimmer"></span>
                    <span className="relative flex items-center gap-2">
                      <Gift className="w-4 h-4" />
                      Presentear
                    </span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal / Bottom Sheet */}
      {modalAberto && itemSelecionado && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm sm:p-4 transition-opacity">
          
          <div 
            className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl relative flex flex-col max-h-[90vh] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Linha indicadora para puxar no mobile */}
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
              {etapaModal === 'formulario' ? (
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
              ) : (
                <div className="flex flex-col items-center text-center pt-2 pb-6">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h2 className="font-serif text-3xl font-bold text-slate-800 mb-3">PIX Gerado!</h2>
                  <p className="text-slate-600 mb-8 leading-relaxed">Escaneie o QR Code ou copie o código abaixo para pagar direto no app do seu banco.</p>
                  
                  <div className="bg-white border-2 border-slate-100 p-4 rounded-3xl mb-8 shadow-sm">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=00020126580014br.gov.bcb.pix" alt="QR Code PIX" className="w-48 h-48 mix-blend-multiply" />
                  </div>

                  <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 relative group">
                    <p className="text-xs text-slate-500 truncate font-mono select-all pr-8">
                      {pixCopiaECola}
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
                  
                  <p className="text-xs text-slate-400 mt-6 font-medium uppercase tracking-wider">
                    A confirmação é automática
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}