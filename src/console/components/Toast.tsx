import { useConsole } from '../store/useConsole'

export default function Toast() {
  const { toastMsg } = useConsole()
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-paper font-sans text-[13.5px] font-medium px-5 py-3 rounded shadow-lg transition-transform duration-300 z-[100] ${
        toastMsg ? 'translate-y-0' : 'translate-y-24'
      }`}
    >
      {toastMsg}
    </div>
  )
}
