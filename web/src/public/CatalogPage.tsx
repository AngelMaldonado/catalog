import { useParams } from 'react-router'
import { VisorPage } from '../visor/VisorPage'

export function CatalogPage() {
  const { slug = '' } = useParams()
  return <VisorPage slug={slug} />
}
