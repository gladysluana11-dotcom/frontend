import { Link } from 'react-router-dom'
import { texts } from '../../shared/texts'
import { Button } from '../../shared/ui/button'
import { PageFrame } from '../../shared/ui/page-frame'

export default function NotFoundPage() {
  return (
    <PageFrame
      title={texts.navigation.notFoundTitle}
      description={texts.navigation.notFoundDescription}
    >
      <Button asChild variant="outline">
        <Link to="/">{texts.navigation.goHome}</Link>
      </Button>
    </PageFrame>
  )
}
