type Props = {
    index: number
    size: number
    label: string
    isHighlighted?: boolean
}

export const Progress = ({ index, size, label, isHighlighted = false }: Props) => {
    return (
        <div className="flex justify-left m-1 items-center">
            <div className="justify-center w-2 text-slate-700 dark:text-slate-300 font-medium">{index + 1}</div>
            <div className="rounded-full w-full ml-2">
                <div
                    style={{ width: `${5 + size}%` }}
                    className={`${
                        isHighlighted ? 'bg-tile-correct' : 'bg-slate-400 dark:bg-slate-600'
                    } text-white text-xs font-bold text-right px-2 py-1 rounded transition-[width] duration-500`}
                >
                    {label}
                </div>
            </div>
        </div>
    )
}
