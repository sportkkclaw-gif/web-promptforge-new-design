import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding PromptForge Studio...');

  // Clean existing data
  await prisma.moderationEvent.deleteMany();
  await prisma.review.deleteMany();
  await prisma.order.deleteMany();
  await prisma.marketplaceItem.deleteMany();
  await prisma.collectionItem.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.generationOutput.deleteMany();
  await prisma.generationRun.deleteMany();
  await prisma.promptTag.deleteMany();
  await prisma.promptAsset.deleteMany();
  await prisma.promptVersion.deleteMany();
  await prisma.prompt.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.taxonomy.deleteMany();
  await prisma.creditsLedger.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.quotaPlan.deleteMany();
  await prisma.creditPackage.deleteMany();
  await prisma.user.deleteMany();

  // ============================================================
  // Plans
  // ============================================================
  const freePlan = await prisma.plan.create({
    data: {
      code: 'FREE',
      monthlyPrice: 0,
      creditQuota: 50,
      maxSeats: 1,
    },
  });

  const proPlan = await prisma.plan.create({
    data: {
      code: 'PRO',
      monthlyPrice: 19.99,
      creditQuota: 1000,
      maxSeats: 1,
    },
  });

  const teamPlan = await prisma.plan.create({
    data: {
      code: 'TEAM',
      monthlyPrice: 79.99,
      creditQuota: 5000,
      maxSeats: 10,
    },
  });

  const enterprisePlan = await prisma.plan.create({
    data: {
      code: 'ENTERPRISE',
      monthlyPrice: 299.99,
      creditQuota: 999999,
      maxSeats: 100,
    },
  });

  // ============================================================
  // Quota Plans (mirrors Plan, for quota/plan-display APIs)
  // ============================================================
  const quotaPlans = await Promise.all([
    prisma.quotaPlan.create({
      data: {
        code: 'FREE', name: 'Free Plan', monthlyPrice: 0,
        creditQuota: 50, maxSeats: 1,
        features: JSON.stringify(['generations_50', 'templates_basic', 'marketplace_view']),
      },
    }),
    prisma.quotaPlan.create({
      data: {
        code: 'PRO', name: 'Pro Plan', monthlyPrice: 19.99,
        creditQuota: 1000, maxSeats: 1,
        features: JSON.stringify(['generations_unlimited', 'templates_all', 'marketplace_sell', 'priority_support']),
      },
    }),
    prisma.quotaPlan.create({
      data: {
        code: 'TEAM', name: 'Team Plan', monthlyPrice: 79.99,
        creditQuota: 5000, maxSeats: 10,
        features: JSON.stringify(['generations_unlimited', 'templates_all', 'marketplace_sell', 'team_collaboration', 'analytics']),
      },
    }),
    prisma.quotaPlan.create({
      data: {
        code: 'ENTERPRISE', name: 'Enterprise Plan', monthlyPrice: 299.99,
        creditQuota: 999999, maxSeats: 100,
        features: JSON.stringify(['everything', 'dedicated_support', 'custom_integrations', 'sla']),
      },
    }),
  ]);

  // ============================================================
  // Credit Packages (purchasable credit bundles)
  // ============================================================
  const creditPackages = await Promise.all([
    prisma.creditPackage.create({
      data: { code: 'credits_100', label: '100 Credits', credits: 100, priceUsd: 5, sortOrder: 1 },
    }),
    prisma.creditPackage.create({
      data: { code: 'credits_500', label: '500 Credits (20% off)', credits: 500, priceUsd: 20, sortOrder: 2 },
    }),
    prisma.creditPackage.create({
      data: { code: 'credits_1000', label: '1,000 Credits (30% off)', credits: 1000, priceUsd: 35, sortOrder: 3 },
    }),
    prisma.creditPackage.create({
      data: { code: 'credits_5000', label: '5,000 Credits (40% off)', credits: 5000, priceUsd: 150, sortOrder: 4 },
    }),
  ]);

  // ============================================================
  // Users
  // ============================================================
  const visitor = await prisma.user.create({
    data: {
      id: 'user_visitor',
      email: 'visitor@promptforge.dev',
      username: 'visitor',
      role: 'visitor',
      credits: 0,
    },
  });

  const member = await prisma.user.create({
    data: {
      id: 'user_member',
      email: 'member@promptforge.dev',
      username: 'member_demo',
      role: 'member',
      credits: 100,
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member',
    },
  });

  const creator = await prisma.user.create({
    data: {
      id: 'user_creator',
      email: 'creator@promptforge.dev',
      username: 'creator_demo',
      role: 'creator',
      credits: 1250,
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=creator',
    },
  });

  const teamAdmin = await prisma.user.create({
    data: {
      id: 'user_team_admin',
      email: 'teamadmin@promptforge.dev',
      username: 'team_admin_demo',
      role: 'team_admin',
      credits: 5000,
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=teamadmin',
    },
  });

  const admin = await prisma.user.create({
    data: {
      id: 'user_admin',
      email: 'admin@promptforge.dev',
      username: 'admin_demo',
      role: 'admin',
      credits: 99999,
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    },
  });

  // ============================================================
  // Workspaces
  // ============================================================
  const teamWorkspace = await prisma.workspace.create({
    data: {
      name: 'Midjourney Masters',
      slug: 'midjourney-masters',
      ownerId: 'user_team_admin',
      planId: teamPlan.id,
    },
  });

  await prisma.workspaceMember.createMany({
    data: [
      { workspaceId: teamWorkspace.id, userId: 'user_team_admin', role: 'owner' },
      { workspaceId: teamWorkspace.id, userId: 'user_member', role: 'member' },
      { workspaceId: teamWorkspace.id, userId: 'user_creator', role: 'admin' },
    ],
  });

  // ============================================================
  // Subscriptions
  // ============================================================
  await prisma.subscription.create({
    data: {
      workspaceId: teamWorkspace.id,
      planId: teamPlan.id,
      status: 'active',
      currentPeriodEnd: new Date('2026-12-31'),
    },
  });

  // ============================================================
  // Categories (flat list — for simple browsing taxonomy)
  // ============================================================
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Marketing', slug: 'marketing', sort: 1 } }),
    prisma.category.create({ data: { name: 'E-commerce', slug: 'ecommerce', sort: 2 } }),
    prisma.category.create({ data: { name: 'Gaming', slug: 'gaming', sort: 3 } }),
    prisma.category.create({ data: { name: 'Character Design', slug: 'character-design', sort: 4 } }),
    prisma.category.create({ data: { name: 'Photography', slug: 'photography', sort: 5 } }),
    prisma.category.create({ data: { name: 'Architecture', slug: 'architecture', sort: 6 } }),
    prisma.category.create({ data: { name: 'Logo', slug: 'logo', sort: 7 } }),
    prisma.category.create({ data: { name: 'Short Video', slug: 'short-video', sort: 8 } }),
    prisma.category.create({ data: { name: 'Copywriting', slug: 'copywriting', sort: 9 } }),
    prisma.category.create({ data: { name: 'Education', slug: 'education', sort: 10 } }),
  ]);

  // ============================================================
  // Taxonomy (hierarchical — parent/child for rich category trees)
  // 6 top-level categories with subcategories each
  // ============================================================
  const taxData = [
    // Marketing
    { name: 'Marketing', slug: 'tax-marketing', type: 'category', sort: 1, children: [
      { name: 'Social Media', slug: 'tax-marketing-social', type: 'category', sort: 1 },
      { name: 'Email Campaigns', slug: 'tax-marketing-email', type: 'category', sort: 2 },
      { name: 'Ads & Banners', slug: 'tax-marketing-ads', type: 'category', sort: 3 },
    ]},
    // E-commerce
    { name: 'E-commerce', slug: 'tax-ecommerce', type: 'category', sort: 2, children: [
      { name: 'Product Photography', slug: 'tax-ecom-product', type: 'category', sort: 1 },
      { name: 'Fashion & Apparel', slug: 'tax-ecom-fashion', type: 'category', sort: 2 },
      { name: 'Lifestyle & Home', slug: 'tax-ecom-lifestyle', type: 'category', sort: 3 },
    ]},
    // Gaming
    { name: 'Gaming', slug: 'tax-gaming', type: 'category', sort: 3, children: [
      { name: 'Character Art', slug: 'tax-gaming-character', type: 'category', sort: 1 },
      { name: 'Environment Art', slug: 'tax-gaming-environment', type: 'category', sort: 2 },
      { name: 'UI & HUD', slug: 'tax-gaming-ui', type: 'category', sort: 3 },
    ]},
    // Character Design
    { name: 'Character Design', slug: 'tax-character', type: 'category', sort: 4, children: [
      { name: 'Portraits', slug: 'tax-character-portraits', type: 'category', sort: 1 },
      { name: 'Full Body', slug: 'tax-character-fullbody', type: 'category', sort: 2 },
      { name: 'Fantasy & Sci-Fi', slug: 'tax-character-fantasy', type: 'category', sort: 3 },
    ]},
    // Photography
    { name: 'Photography', slug: 'tax-photography', type: 'category', sort: 5, children: [
      { name: 'Portrait', slug: 'tax-photo-portrait', type: 'category', sort: 1 },
      { name: 'Landscape', slug: 'tax-photo-landscape', type: 'category', sort: 2 },
      { name: 'Wildlife', slug: 'tax-photo-wildlife', type: 'category', sort: 3 },
    ]},
    // Architecture
    { name: 'Architecture', slug: 'tax-architecture', type: 'category', sort: 6, children: [
      { name: 'Exterior', slug: 'tax-arch-exterior', type: 'category', sort: 1 },
      { name: 'Interior', slug: 'tax-arch-interior', type: 'category', sort: 2 },
      { name: 'Urban Design', slug: 'tax-arch-urban', type: 'category', sort: 3 },
    ]},
  ];

  let taxonomyCount = 0;
  for (const parent of taxData) {
    const created = await prisma.taxonomy.create({
      data: { name: parent.name, slug: parent.slug, type: parent.type, sort: parent.sort },
    });
    taxonomyCount++; // parent
    for (const child of parent.children) {
      await prisma.taxonomy.create({
        data: { name: child.name, slug: child.slug, type: child.type, sort: child.sort, parentId: created.id },
      });
      taxonomyCount++; // child
    }
  }

  // ============================================================
  // Tags
  // ============================================================
  const tagNames = [
    'photorealistic', 'anime', '3d-render', 'oil-painting', 'watercolor',
    'cyberpunk', 'fantasy', 'portrait', 'landscape', 'product-shot',
    'logo-design', 'icon', 'ui-design', 'fashion', 'nature',
    'urban', 'sci-fi', 'horror', 'comedy', 'dramatic'
  ];

  const tags: any[] = [];
  for (const name of tagNames) {
    tags.push(await prisma.tag.create({ data: { name, slug: name } }));
  }

  // ============================================================
  // Prompts (24 cards)
  // ============================================================
  const promptData = [
    {
      id: 'prompt_001',
      ownerId: 'user_creator',
      title: 'Ultra-Realistic Product Shot',
      slug: 'ultra-realistic-product-shot',
      summary: 'Professional product photography with soft studio lighting and clean background.',
      content: 'product photography, softbox lighting, white seamless background, Canon EOS R5, 85mm lens, f/2.8, pristine white background, studio professional, high-end commercial photography, shallow depth of field, clean shadows, 8k resolution',
      negativePrompt: 'cartoon, anime, illustration, painting, drawings, text, watermark, logo, busy background, cluttered, ugly, poorly drawn',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 30, guidance: 7.5, seed: 123456, aspectRatio: '1:1' }),
      status: 'published',
      priceCredits: 0,
      viewCount: 3420,
      saveCount: 234,
    },
    {
      id: 'prompt_002',
      ownerId: 'user_creator',
      title: 'Cyberpunk City Nightscape',
      slug: 'cyberpunk-city-nightscape',
      summary: 'Neon-lit cyberpunk megacity with flying cars and holographic advertisements.',
      content: 'cyberpunk cityscape, neon lights, rain-slicked streets, flying cars, holographic advertisements, blade runner aesthetic, detailed architecture, volumetric fog, cinematic lighting, 8k, unreal engine 5',
      negativePrompt: 'daytime, sunny, bright, cartoon, anime, low quality, poorly drawn, blurry',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 40, guidance: 8.0, seed: 234567, aspectRatio: '16:9' }),
      status: 'published',
      priceCredits: 0,
      viewCount: 5621,
      saveCount: 445,
    },
    {
      id: 'prompt_003',
      ownerId: 'user_creator',
      title: 'Fantasy RPG Character Portrait',
      slug: 'fantasy-rpg-character-portrait',
      summary: 'Detailed fantasy warrior character with ornate armor and magical effects.',
      content: 'fantasy warrior portrait, ornate silver armor, glowing magical runes, epic pose, cinematic lighting, guild wars art style, detailed face, battle-worn, heroic, 4k digital painting',
      negativePrompt: 'modern clothing, casual wear, modern weapons, guns, sci-fi, plain, boring background',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 35, guidance: 7.0, seed: 345678, aspectRatio: '2:3' }),
      status: 'published',
      priceCredits: 15,
      viewCount: 2890,
      saveCount: 312,
    },
    {
      id: 'prompt_004',
      ownerId: 'user_team_admin',
      title: 'Minimalist Logo Generator',
      slug: 'minimalist-logo-generator',
      summary: 'Clean, modern logo designs perfect for tech startups and brands.',
      content: 'minimalist logo design, clean lines, geometric shapes, negative space, flat design, vector style, Pantone colors, professional brand identity, scalable, timeless logo',
      negativePrompt: 'photorealistic, 3d, busy, cluttered, ornate, vintage, grunge, hand-drawn',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 25, guidance: 6.5, seed: 456789, aspectRatio: '1:1' }),
      status: 'published',
      priceCredits: 0,
      viewCount: 7234,
      saveCount: 678,
    },
    {
      id: 'prompt_005',
      ownerId: 'user_member',
      title: 'Anime Girl School Uniform',
      slug: 'anime-girl-school-uniform',
      summary: 'Cute anime character in traditional Japanese school uniform style.',
      content: 'anime girl, school uniform, sailor fuku, pleated skirt, white blouse, red ribbon, long black hair, bright eyes, soft shading, studio ghibli style, vibrant colors, detailed background',
      negativePrompt: 'realistic, photorealistic, adult, mature, nsfw, ugly, deformed, extra limbs',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 30, guidance: 7.0, seed: 567890, aspectRatio: '2:3' }),
      status: 'published',
      priceCredits: 0,
      viewCount: 9823,
      saveCount: 823,
    },
    {
      id: 'prompt_006',
      ownerId: 'user_creator',
      title: 'Luxury Perfume Ad Campaign',
      slug: 'luxury-perfume-ad-campaign',
      summary: 'High-end perfume advertising with dramatic lighting and elegant bottle.',
      content: 'luxury perfume advertisement, crystal bottle, golden liquid, dramatic spotlight, silk drapes, editorial fashion photography, Vogue style, 85mm lens bokeh, 8k ultra detailed',
      negativePrompt: 'cheap, discount, plastic, cluttered, busy background, cartoon, anime',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 35, guidance: 8.0, seed: 678901, aspectRatio: '3:4' }),
      status: 'published',
      priceCredits: 20,
      viewCount: 1567,
      saveCount: 89,
    },
    {
      id: 'prompt_007',
      ownerId: 'user_creator',
      title: 'Architectural Visualization Modern Villa',
      slug: 'architectural-visualization-modern-villa',
      summary: 'Contemporary architecture rendering with seamless glass and natural materials.',
      content: 'modern architectural visualization, contemporary villa, floor to ceiling glass windows, concrete and wood elements, infinity pool, landscaped gardens, golden hour lighting, architectural photography, real estate render',
      negativePrompt: 'interior decoration, furniture, people, cars, cluttered, ugly facade, outdated style',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 40, guidance: 7.5, seed: 789012, aspectRatio: '16:9' }),
      status: 'published',
      priceCredits: 0,
      viewCount: 4532,
      saveCount: 334,
    },
    {
      id: 'prompt_008',
      ownerId: 'user_member',
      title: 'Vintage Travel Poster',
      slug: 'vintage-travel-poster',
      summary: 'Retro travel poster style artwork with bold colors and Art Deco influences.',
      content: 'vintage travel poster, Art Deco style, tropical beach sunset, bold geometric shapes, limited color palette, WPA poster aesthetic, flat illustration, typography ready, 1930s travel advertisement',
      negativePrompt: 'photorealistic, 3d render, modern, minimalist, grunge, dirty, weathered',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 28, guidance: 7.0, seed: 890123, aspectRatio: '3:4' }),
      status: 'published',
      priceCredits: 0,
      viewCount: 2341,
      saveCount: 187,
    },
    {
      id: 'prompt_009',
      ownerId: 'user_creator',
      title: 'Sci-Fi Mech Warrior',
      slug: 'scifi-mech-warrior',
      summary: 'Massive combat mech with detailed mechanical design and battle damage.',
      content: 'giant combat mech robot, detailed mechanical parts, hydraulic pistons, battle damaged armor, dramatic sunset backdrop, concept art style, industrial sci-fi, blue and orange color scheme, hyper detailed',
      negativePrompt: 'cute, small robot, cartoon, anime, simple, low detail, blurry',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 35, guidance: 8.5, seed: 901234, aspectRatio: '3:4' }),
      status: 'published',
      priceCredits: 0,
      viewCount: 3456,
      saveCount: 298,
    },
    {
      id: 'prompt_010',
      ownerId: 'user_team_admin',
      title: 'E-commerce Fashion Model',
      slug: 'ecommerce-fashion-model',
      summary: 'Full body fashion model shot ideal for online clothing stores.',
      content: 'fashion model full body shot, stylish outfit, studio lighting, e-commerce photography, clean white background, retail ready, fashion magazine style, natural pose, 85mm lens, detailed fabric texture',
      negativePrompt: 'nude, inappropriate, cartoon, anime, outdoor, location shoot, gritty',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 30, guidance: 7.5, seed: 101234, aspectRatio: '2:3' }),
      status: 'published',
      priceCredits: 0,
      viewCount: 6789,
      saveCount: 556,
    },
    {
      id: 'prompt_011',
      ownerId: 'user_creator',
      title: 'Dark Fantasy Demon Lord',
      slug: 'dark-fantasy-demon-lord',
      summary: 'Menacing dark lord character with demonic features and dark magic aura.',
      content: 'dark fantasy demon lord, horns, glowing red eyes, tattered cloak, dark magic aura, gothic armor, throne room backdrop, epic composition, dark souls inspired, hyper detailed digital art',
      negativePrompt: 'bright, cheerful, cute, cartoon, anime, disney, pastel colors, wholesome',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 40, guidance: 8.0, seed: 112345, aspectRatio: '2:3' }),
      status: 'published',
      priceCredits: 25,
      viewCount: 4567,
      saveCount: 389,
    },
    {
      id: 'prompt_012',
      ownerId: 'user_member',
      title: 'Watercolor Landscape Scenery',
      slug: 'watercolor-landscape-scenery',
      summary: 'Beautiful watercolor landscape with rolling hills and sunset sky.',
      content: 'watercolor landscape painting, rolling green hills, dramatic sunset sky, loose brushstrokes, soft color bleeding, paper texture visible, impressionistic style, peaceful countryside, traditional watercolor on cold press paper',
      negativePrompt: 'digital art, 3d render, photorealistic, sharp edges, tight rendering, geometric',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 25, guidance: 6.0, seed: 123456, aspectRatio: '16:9' }),
      status: 'published',
      priceCredits: 0,
      viewCount: 1890,
      saveCount: 156,
    },
    {
      id: 'prompt_013',
      ownerId: 'user_creator',
      title: 'Social Media Icon Pack',
      slug: 'social-media-icon-pack',
      summary: 'Modern social media icons with consistent style and vibrant gradients.',
      content: 'social media icon pack, consistent style guide, vibrant gradients, rounded corners, flat design, vector ready, app icon style, modern UI, cohesive color palette, 1024x1024',
      negativePrompt: 'realistic, photograph, detailed, complex, grunge, hand-drawn, sketch',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 20, guidance: 6.5, seed: 134567, aspectRatio: '1:1' }),
      status: 'published',
      priceCredits: 10,
      viewCount: 8901,
      saveCount: 723,
    },
    {
      id: 'prompt_014',
      ownerId: 'user_team_admin',
      title: 'Portrait Oil Painting Style',
      slug: 'portrait-oil-painting-style',
      summary: 'Classical oil painting style portrait with dramatic chiaroscuro lighting.',
      content: 'classical oil painting portrait, Rembrandt lighting, dramatic chiaroscuro, rich dark background, thick impasto brushstrokes, realistic yet painterly, museum quality, 17th century master style',
      negativePrompt: 'digital art, modern, cartoon, anime, flat, illustration, sketch, minimalist',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 35, guidance: 7.5, seed: 145678, aspectRatio: '2:3' }),
      status: 'published',
      priceCredits: 0,
      viewCount: 2345,
      saveCount: 201,
    },
    {
      id: 'prompt_015',
      ownerId: 'user_creator',
      title: 'Isometric Game Asset City',
      slug: 'isometric-game-asset-city',
      summary: 'Cute isometric city buildings perfect for indie game development.',
      content: 'isometric game asset, cute city buildings, low poly style, pastel colors, consistent tile size, game ready, Unity Unreal engine friendly, morning sunlight, detailed facades, charming aesthetic',
      negativePrompt: 'realistic, photorealistic, high poly, complex, dark theme, gritty',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 30, guidance: 7.0, seed: 156789, aspectRatio: '1:1' }),
      status: 'published',
      priceCredits: 0,
      viewCount: 3456,
      saveCount: 289,
    },
    {
      id: 'prompt_016',
      ownerId: 'user_member',
      title: 'Nature Wildlife Photography',
      slug: 'nature-wildlife-photography',
      summary: 'Stunning wildlife photo of eagle in natural mountain habitat.',
      content: 'wildlife photography, bald eagle perched on pine branch, mountain wilderness backdrop, golden hour light,Canon EOS R5, 400mm lens, sharp feather detail, natural habitat, national geographic style',
      negativePrompt: 'zoo, captive, cage, artificial, cartoon, anime, illustration, painting',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 32, guidance: 7.5, seed: 167890, aspectRatio: '3:2' }),
      status: 'published',
      priceCredits: 0,
      viewCount: 4567,
      saveCount: 378,
    },
    {
      id: 'prompt_017',
      ownerId: 'user_creator',
      title: 'Futuristic UI Dashboard',
      slug: 'futuristic-ui-dashboard',
      summary: 'Sleek sci-fi UI design for software dashboard and data visualization.',
      content: 'futuristic UI design, holographic interface, dark theme, neon accent lights, data visualization panels, sci-fi control room, unreal engine quality, sleek and modern, floating UI elements',
      negativePrompt: 'retro, vintage, skeuomorphic, flat 2d, ms-dos style, windows 95, busy cluttered',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 28, guidance: 7.0, seed: 178901, aspectRatio: '16:9' }),
      status: 'published',
      priceCredits: 0,
      viewCount: 5678,
      saveCount: 445,
    },
    {
      id: 'prompt_018',
      ownerId: 'user_team_admin',
      title: 'Steampunk Inventor Character',
      slug: 'steampunk-inventor-character',
      summary: 'Victorian-era inventor with brass mechanical contraptions and goggles.',
      content: 'steampunk inventor character, Victorian era, brass mechanical arm, safety goggles, leather apron, steam-powered gadgets, clockwork mechanisms, sepia tones, adventure time style',
      negativePrompt: 'modern, futuristic, sci-fi, cyberpunk, anime, cartoon, simple, low detail',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 35, guidance: 7.5, seed: 189012, aspectRatio: '2:3' }),
      status: 'published',
      priceCredits: 0,
      viewCount: 2789,
      saveCount: 223,
    },
    {
      id: 'prompt_019',
      ownerId: 'user_creator',
      title: 'Abstract Fluid Art Background',
      slug: 'abstract-fluid-art-background',
      summary: 'Colorful abstract fluid art perfect for backgrounds and merch printing.',
      content: 'abstract fluid art, pouring technique, vibrant rainbow colors, flowing organic shapes, resin art style, high saturation, 4k print ready, modern abstract background, colorful chaos',
      negativePrompt: 'geometric, precise, lines, drawings, illustration, cartoon, anime, minimalist',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 22, guidance: 6.5, seed: 190123, aspectRatio: '16:9' }),
      status: 'published',
      priceCredits: 0,
      viewCount: 8901,
      saveCount: 667,
    },
    {
      id: 'prompt_020',
      ownerId: 'user_member',
      title: 'Horror Game Environment Dark Corridor',
      slug: 'horror-game-environment-dark-corridor',
      summary: 'Atmospheric horror game level design with flickering lights and decay.',
      content: 'horror game environment, dark abandoned corridor, flickering fluorescent lights, peeling wallpaper, eerie atmosphere, dead end, unsettling ambiance, resident evil style, volumetric dust particles',
      negativePrompt: 'bright, sunny, cheerful, colorful, cartoon, anime, friendly, safe, cozy',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 38, guidance: 8.0, seed: 201234, aspectRatio: '16:9' }),
      status: 'published',
      priceCredits: 0,
      viewCount: 3456,
      saveCount: 278,
    },
    {
      id: 'prompt_021',
      ownerId: 'user_creator',
      title: 'Children Book Illustration Forest',
      slug: 'children-book-illustration-forest',
      summary: 'Whimsical forest scene for children picture book with friendly animals.',
      content: 'children book illustration, whimsical forest scene, friendly rabbit and fox, magical glowing mushrooms, soft pastel colors, storybook style, hand-painted texture, gentle lighting, perfect for ages 3-6',
      negativePrompt: 'realistic, photorealistic, scary, dark, horror, violent, complex, adult themes',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 28, guidance: 6.5, seed: 212345, aspectRatio: '16:9' }),
      status: 'published',
      priceCredits: 0,
      viewCount: 4567,
      saveCount: 389,
    },
    {
      id: 'prompt_022',
      ownerId: 'user_team_admin',
      title: 'Car Commercial Photography',
      slug: 'car-commercial-photography',
      summary: 'High-end sports car editorial shot with dramatic studio lighting.',
      content: 'high-end sports car editorial photography, dramatic studio lighting, reflective floor, sleek silhouette, automotive commercial, motor trend magazine style, dramatic shadows, studio backdrop',
      negativePrompt: 'outdoor, location, dirty, wrecked, damaged, cartoon, anime, illustration',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 35, guidance: 8.0, seed: 223456, aspectRatio: '16:9' }),
      status: 'published',
      priceCredits: 30,
      viewCount: 2345,
      saveCount: 156,
    },
    {
      id: 'prompt_023',
      ownerId: 'user_creator',
      title: 'Pixel Art Retro Game Scene',
      slug: 'pixel-art-retro-game-scene',
      summary: '16-bit style pixel art game scene with parallax scrolling layers.',
      content: '16-bit pixel art game scene, parallax scrolling layers, vibrant colors, snes era style, scrolling platformer background, detailed pixel by pixel, retro gaming aesthetic, nostalgic gaming scene',
      negativePrompt: '3d, realistic, photorealistic, modern ui, flat design, vector, high poly',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 20, guidance: 6.0, seed: 234567, aspectRatio: '16:9' }),
      status: 'published',
      priceCredits: 0,
      viewCount: 5678,
      saveCount: 478,
    },
    {
      id: 'prompt_024',
      ownerId: 'user_member',
      title: 'Cosmic Space Nebula',
      slug: 'cosmic-space-nebula',
      summary: 'Breathtaking deep space nebula with vibrant colors and star formation.',
      content: 'cosmic space nebula,Hubble telescope quality, vibrant purple and orange gases, star formation regions, stellar nursery, deep space astrophotography, cosmic dust clouds, 8k ultra hd space imagery',
      negativePrompt: 'earth, planets, moons, spacecraft, astronauts, cartoon, anime, illustration',
      engine: 'stable-diffusion',
      model: 'sd-xl',
      parameters: JSON.stringify({ steps: 40, guidance: 8.5, seed: 245678, aspectRatio: '16:9' }),
      status: 'published',
      priceCredits: 0,
      viewCount: 7890,
      saveCount: 623,
    },
  ];

  for (const data of promptData) {
    await prisma.prompt.create({ data });
  }

  // ============================================================
  // Prompt Versions (at least one per prompt)
  // ============================================================
  for (let i = 0; i < 24; i++) {
    const promptId = `prompt_${String(i + 1).padStart(3, '0')}`;
    await prisma.promptVersion.create({
      data: {
        promptId,
        version: 1,
        content: `Revised version of prompt ${i + 1} with improved parameters.`,
        negativePrompt: 'low quality, blurry, distorted',
        parameters: JSON.stringify({ steps: 30 + i, guidance: 7.0 + (i % 3) * 0.5, seed: Math.floor(Math.random() * 999999) }),
        changelog: 'Initial version',
      },
    });
    if (i % 3 === 0) {
      await prisma.promptVersion.create({
        data: {
          promptId,
          version: 2,
          content: `Updated version ${i + 1}.v2 with enhanced details and better composition.`,
          negativePrompt: 'artifacts, noise, over-saturated',
          parameters: JSON.stringify({ steps: 35 + i, guidance: 7.5 + (i % 2) * 0.5, seed: Math.floor(Math.random() * 999999) }),
          changelog: 'Improved composition and reduced artifacts',
        },
      });
    }
  }

  // ============================================================
  // Prompt Assets (cover + samples)
  // ============================================================
  const promptIds = Array.from({ length: 24 }, (_, i) => `prompt_${String(i + 1).padStart(3, '0')}`);
  for (const pid of promptIds) {
    await prisma.promptAsset.create({
      data: {
        promptId: pid,
        type: 'cover',
        url: `https://picsum.photos/seed/${pid}/800/600`,
        alt: `${pid} cover image`,
      },
    });
    for (let s = 1; s <= 2; s++) {
      await prisma.promptAsset.create({
        data: {
          promptId: pid,
          type: 'sample',
          url: `https://picsum.photos/seed/${pid}_sample${s}/400/400`,
          alt: `${pid} sample ${s}`,
        },
      });
    }
  }

  // ============================================================
  // Prompt Tags
  // ============================================================
  for (let i = 0; i < 24; i++) {
    const pid = `prompt_${String(i + 1).padStart(3, '0')}`;
    await prisma.promptTag.create({ data: { promptId: pid, tagId: tags[i % tags.length].id } });
    await prisma.promptTag.create({ data: { promptId: pid, tagId: tags[(i + 5) % tags.length].id } });
  }

  // ============================================================
  // Collections (4)
  // ============================================================
  const col1 = await prisma.collection.create({
    data: { ownerId: 'user_member', name: 'My Inspiration', visibility: 'private' },
  });
  const col2 = await prisma.collection.create({
    data: { ownerId: 'user_creator', name: 'Marketing Assets', visibility: 'public' },
  });
  const col3 = await prisma.collection.create({
    data: { ownerId: 'user_team_admin', name: 'Team Design Kit', visibility: 'workspace', workspaceId: teamWorkspace.id },
  });
  const col4 = await prisma.collection.create({
    data: { ownerId: 'user_member', name: 'Character refs', visibility: 'private' },
  });

  // Collection items
  await prisma.collectionItem.createMany({
    data: [
      { collectionId: col1.id, promptId: 'prompt_001' },
      { collectionId: col1.id, promptId: 'prompt_002' },
      { collectionId: col1.id, promptId: 'prompt_003' },
      { collectionId: col2.id, promptId: 'prompt_004' },
      { collectionId: col2.id, promptId: 'prompt_006' },
      { collectionId: col3.id, promptId: 'prompt_007' },
      { collectionId: col3.id, promptId: 'prompt_010' },
      { collectionId: col3.id, promptId: 'prompt_013' },
      { collectionId: col4.id, promptId: 'prompt_003' },
      { collectionId: col4.id, promptId: 'prompt_005' },
      { collectionId: col4.id, promptId: 'prompt_011' },
    ],
  });

  // ============================================================
  // Marketplace Items (8)
  // ============================================================
  const marketItems = [
    { promptId: 'prompt_003', sellerId: 'user_creator', priceCredits: 15, license: 'personal' },
    { promptId: 'prompt_006', sellerId: 'user_creator', priceCredits: 20, license: 'commercial' },
    { promptId: 'prompt_011', sellerId: 'user_creator', priceCredits: 25, license: 'personal' },
    { promptId: 'prompt_013', sellerId: 'user_team_admin', priceCredits: 10, license: 'extended' },
    { promptId: 'prompt_022', sellerId: 'user_creator', priceCredits: 30, license: 'commercial' },
    { promptId: 'prompt_001', sellerId: 'user_creator', priceCredits: 5, license: 'personal' },
    { promptId: 'prompt_004', sellerId: 'user_team_admin', priceCredits: 5, license: 'personal' },
    { promptId: 'prompt_010', sellerId: 'user_team_admin', priceCredits: 10, license: 'commercial' },
  ];

  for (const item of marketItems) {
    await prisma.marketplaceItem.create({ data: { ...item, salesCount: Math.floor(Math.random() * 50) } });
  }

  // ============================================================
  // Generation Runs (6)
  // ============================================================
  const runs = [];
  for (let i = 0; i < 6; i++) {
    const run = await prisma.generationRun.create({
      data: {
        promptId: promptIds[i],
        userId: i % 2 === 0 ? 'user_member' : 'user_creator',
        engine: 'stable-diffusion',
        parameters: JSON.stringify({ steps: 30, guidance: 7.5 }),
        status: i < 4 ? 'succeeded' : 'mocked',
      },
    });
    runs.push(run);
  }

  // Generation Outputs (4 per run)
  for (const run of runs) {
    for (let o = 0; o < 4; o++) {
      await prisma.generationOutput.create({
        data: {
          runId: run.id,
          url: `https://picsum.photos/seed/${run.id}_out${o}/1024/1024`,
          mimeType: 'image/png',
          width: 1024,
          height: 1024,
          seed: String(Math.floor(Math.random() * 999999)),
        },
      });
    }
  }

  // ============================================================
  // Reviews (6)
  // ============================================================
  await prisma.review.createMany({
    data: [
      { userId: 'user_member', promptId: 'prompt_001', rating: 5, content: 'Perfect for product shots, exactly what I needed!' },
      { userId: 'user_member', promptId: 'prompt_002', rating: 5, content: 'Incredible cyberpunk atmosphere, love the neon glow!' },
      { userId: 'user_team_admin', promptId: 'prompt_003', rating: 4, content: 'Great character design, but could use more variation options.' },
      { userId: 'user_creator', promptId: 'prompt_004', rating: 5, content: 'Clean and professional, perfect for our startup branding.' },
      { userId: 'user_member', promptId: 'prompt_005', rating: 4, content: 'Cute anime style, good for social media content.' },
      { userId: 'user_team_admin', promptId: 'prompt_006', rating: 5, content: 'Stunning luxury feel, used it for our perfume campaign!' },
    ],
  });

  // ============================================================
  // Credits Ledger
  // ============================================================
  await prisma.creditsLedger.createMany({
    data: [
      { userId: 'user_creator', delta: 1000, balanceAfter: 1000, reason: 'Pro subscription bonus', refType: 'subscription', refId: 'sub_001' },
      { userId: 'user_creator', delta: -15, balanceAfter: 985, reason: 'Marketplace purchase: prompt_003', refType: 'order', refId: 'order_001' },
      { userId: 'user_member', delta: 100, balanceAfter: 100, reason: 'Welcome bonus', refType: 'signup', refId: 'user_member' },
      { userId: 'user_team_admin', delta: 5000, balanceAfter: 5000, reason: 'Team subscription bonus', refType: 'subscription', refId: 'sub_002' },
      { userId: 'user_creator', delta: 150, balanceAfter: 1135, reason: 'Marketplace sale: prompt_003', refType: 'sale', refId: 'order_002' },
    ],
  });

  console.log('✅ Seeded successfully!');
  console.log('  Plans:', 4);
  console.log('  QuotaPlans:', 4);
  console.log('  CreditPackages:', 4);
  console.log('  Users:', 5);
  console.log('  Workspaces:', 1);
  console.log('  Categories:', categories.length);
  console.log('  Taxonomy (hierarchical):', taxonomyCount);
  console.log('  Tags:', tags.length);
  console.log('  Prompts:', promptData.length);
  console.log('  Prompt Versions:', 24 + 8);
  console.log('  Prompt Assets:', 24 * 3);
  console.log('  Collections:', 4);
  console.log('  Marketplace Items:', marketItems.length);
  console.log('  Generation Runs:', 6);
  console.log('  Generation Outputs:', 24);
  console.log('  Reviews:', 6);
  console.log('  Credits Ledger:', 5);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
