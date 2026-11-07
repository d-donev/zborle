import { CharStatus } from '../../lib/statuses'
import classnames from 'classnames'

type Props = {
    status: CharStatus
}

export const MiniCell = ({ status }: Props) => {
    const classes = classnames('w-10 h-10 border-2 flex items-center justify-center mx-0.5 text-lg font-bold rounded', {
        'tile-absent': status === 'absent',
        'tile-correct': status === 'correct',
        'tile-present': status === 'present',
    })

    return <div className={classes}></div>
}
