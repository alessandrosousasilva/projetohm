import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Gift, X } from 'lucide-react'

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

  // Código PIX falso para teste visual
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
      .insert([
        {
          item_id: itemSelecionado.id,
          nome_doador: nome,
          mensagem: mensagem,
          valor_pago: parseFloat(valor),
          status_pagamento: 'pendente'
        }
      ])

    if (error) {
      console.error('Erro ao salvar transação:', error)
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 animate-pulse">Carregando presentes...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans relative">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            Presentes Heron & Malu
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Ajude-nos a construir nosso novo lar. Escolha um item abaixo e contribua com o valor que desejar. Cada ajuda conta!
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {itens.map((item) => {
            const porcentagem = Math.min((item.valor_arrecadado / item.valor_meta) * 100, 100).toFixed(1)
            
            return (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-48 overflow-hidden bg-slate-200">
                  {item.imagem_url ? (
                    <img src={item.imagem_url} alt={item.nome} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Gift className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">{item.nome}</h3>
                  <p className="text-sm text-slate-500 mb-6 line-clamp-2">{item.descricao}</p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        R$ {item.valor_arrecadado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-slate-500">
                        de R$ {item.valor_meta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full rounded-full transition-all duration-1000 ease-out relative"
                        style={{ width: `${porcentagem}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                      </div>
                    </div>
                    <p className="text-right text-xs text-emerald-600 font-semibold">{porcentagem}% concluído</p>
                  </div>

                  <button 
                    onClick={() => abrirModal(item)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-colors cursor-pointer"
                  >
                    Ajudar com este item
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {modalAberto && itemSelecionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
            <button 
              onClick={fecharModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer z-10"
            >
              <X className="w-6 h-6" />
            </button>
            
            {etapaModal === 'formulario' ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Colaborador</h2>
                <p className="text-slate-600 mb-6 text-sm">Você está ajudando na compra de: <strong className="text-slate-800">{itemSelecionado.nome}</strong></p>

                <form onSubmit={lidarComPagamento} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Seu Nome</label>
                    <input 
                      type="text" 
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                      placeholder="Como os noivos devem te chamar?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mensagem (Opcional)</label>
                    <textarea 
                      value={mensagem}
                      onChange={(e) => setMensagem(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all resize-none"
                      placeholder="Deixe um recado para Heron e Malu..."
                      rows="3"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Valor da Ajuda (R$)</label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      step="0.01"
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-lg font-semibold"
                      placeholder="0,00"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={carregandoPix}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl transition-colors mt-4 flex items-center justify-center cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {carregandoPix ? 'Gerando PIX...' : 'Gerar PIX Copia e Cola'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-8 duration-500 flex flex-col items-center text-center pt-4">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">PIX Gerado!</h2>
                <p className="text-slate-600 mb-6 text-sm">Escaneie o QR Code ou copie o código abaixo para pagar no seu banco.</p>
                
                <div className="bg-slate-100 p-4 rounded-2xl mb-6">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=00020126580014br.gov.bcb.pix" alt="QR Code PIX" className="w-48 h-48 mix-blend-multiply" />
                </div>

                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6 flex items-center gap-3">
                  <p className="text-xs text-slate-500 truncate flex-1 font-mono select-all">
                    {pixCopiaECola}
                  </p>
                </div>

                <button 
                  onClick={copiarPix}
                  className={`w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    copiado ? 'bg-slate-800 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                >
                  {copiado ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5"/>
                      </svg>
                      Código Copiado!
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                      </svg>
                      Copiar Código PIX
                    </>
                  )}
                </button>
                
                <p className="text-xs text-slate-400 mt-4">
                  A confirmação do pagamento pode levar até 5 minutos.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}