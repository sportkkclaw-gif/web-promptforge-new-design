// Marketplace slug detail page — uses the same dark showcase surface as item details.
import MarketplaceItemPage from '../items/[id]/page';

export const dynamic = 'force-dynamic';

export default async function MarketplaceTemplatePage({ params }: { params: { slug: string } }) {
  return MarketplaceItemPage({ params: { id: params.slug } });
}
