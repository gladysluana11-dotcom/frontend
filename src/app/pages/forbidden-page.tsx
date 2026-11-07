import { Link } from 'react-router-dom'
import { texts } from '../../shared/texts'
import { Button } from '../../shared/ui/button'
import { PageFrame } from '../../shared/ui/page-frame'

export default function ForbiddenPage() {
  return (
    <PageFrame
      title={texts.navigation.forbiddenTitle}
      description={texts.navigation.noPermission}
    >
      <Button asChild variant="outline">
        <Link to="/">{texts.navigation.backToDashboard}</Link>
      </Button>
    </PageFrame>
  )
}
