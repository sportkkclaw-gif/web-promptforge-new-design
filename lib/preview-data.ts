export type PreviewPrompt = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  engine: string;
  model: string;
  status: string;
  priceCredits: number;
  viewCount: number;
  saveCount: number;
  content: string;
  negativePrompt: string;
  parameters: string;
  owner: { id: string; username: string; avatarUrl: string | null };
  assets: { id: string; type: string; alt: string; url: string }[];
  promptTags: { tag: { id: string; name: string; slug: string } }[];
  marketplaceItem: null | { id: string; priceCredits: number; license: string; salesCount: number; ratingAvg: number };
  reviews: { id: string; rating: number; content: string; user: { username: string; avatarUrl: string | null } }[];
};

export const previewPrompts: PreviewPrompt[] = [
  {
    "id": "prompt_001",
    "title": "Ultra-Realistic Product Shot",
    "slug": "ultra-realistic-product-shot",
    "summary": "Professional product photography with soft studio lighting and clean background.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 0,
    "viewCount": 3420,
    "saveCount": 234,
    "content": "product photography, softbox lighting, white seamless background, Canon EOS R5, 85mm lens, f/2.8, pristine white background, studio professional, high-end commercial photography, shallow depth of field, clean shadows, 8k resolution",
    "negativePrompt": "cartoon, anime, illustration, painting, drawings, text, watermark, logo, busy background, cluttered, ugly, poorly drawn",
    "parameters": "{}",
    "owner": {
      "id": "user_creator",
      "username": "visualsmith",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_001_1",
        "type": "sample",
        "alt": "Ultra-Realistic Product Shot sample 1",
        "url": "/demo-covers/prompt_001.svg"
      },
      {
        "id": "asset_prompt_001_2",
        "type": "sample",
        "alt": "Ultra-Realistic Product Shot sample 2",
        "url": "/demo-covers/prompt_001.svg"
      },
      {
        "id": "asset_prompt_001_3",
        "type": "sample",
        "alt": "Ultra-Realistic Product Shot sample 3",
        "url": "/demo-covers/prompt_001.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  },
  {
    "id": "prompt_002",
    "title": "Cyberpunk City Nightscape",
    "slug": "cyberpunk-city-nightscape",
    "summary": "Neon-lit cyberpunk megacity with flying cars and holographic advertisements.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 0,
    "viewCount": 5621,
    "saveCount": 445,
    "content": "cyberpunk cityscape, neon lights, rain-slicked streets, flying cars, holographic advertisements, blade runner aesthetic, detailed architecture, volumetric fog, cinematic lighting, 8k, unreal engine 5",
    "negativePrompt": "daytime, sunny, bright, cartoon, anime, low quality, poorly drawn, blurry",
    "parameters": "{}",
    "owner": {
      "id": "user_creator",
      "username": "visualsmith",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_002_1",
        "type": "sample",
        "alt": "Cyberpunk City Nightscape sample 1",
        "url": "/demo-covers/prompt_002.svg"
      },
      {
        "id": "asset_prompt_002_2",
        "type": "sample",
        "alt": "Cyberpunk City Nightscape sample 2",
        "url": "/demo-covers/prompt_002.svg"
      },
      {
        "id": "asset_prompt_002_3",
        "type": "sample",
        "alt": "Cyberpunk City Nightscape sample 3",
        "url": "/demo-covers/prompt_002.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  },
  {
    "id": "prompt_003",
    "title": "Fantasy RPG Character Portrait",
    "slug": "fantasy-rpg-character-portrait",
    "summary": "Detailed fantasy warrior character with ornate armor and magical effects.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 15,
    "viewCount": 2890,
    "saveCount": 312,
    "content": "fantasy warrior portrait, ornate silver armor, glowing magical runes, epic pose, cinematic lighting, guild wars art style, detailed face, battle-worn, heroic, 4k digital painting",
    "negativePrompt": "modern clothing, casual wear, modern weapons, guns, sci-fi, plain, boring background",
    "parameters": "{}",
    "owner": {
      "id": "user_creator",
      "username": "visualsmith",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_003_1",
        "type": "sample",
        "alt": "Fantasy RPG Character Portrait sample 1",
        "url": "/demo-covers/prompt_003.svg"
      },
      {
        "id": "asset_prompt_003_2",
        "type": "sample",
        "alt": "Fantasy RPG Character Portrait sample 2",
        "url": "/demo-covers/prompt_003.svg"
      },
      {
        "id": "asset_prompt_003_3",
        "type": "sample",
        "alt": "Fantasy RPG Character Portrait sample 3",
        "url": "/demo-covers/prompt_003.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  },
  {
    "id": "prompt_004",
    "title": "Minimalist Logo Generator",
    "slug": "minimalist-logo-generator",
    "summary": "Clean, modern logo designs perfect for tech startups and brands.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 0,
    "viewCount": 7234,
    "saveCount": 678,
    "content": "minimalist logo design, clean lines, geometric shapes, negative space, flat design, vector style, Pantone colors, professional brand identity, scalable, timeless logo",
    "negativePrompt": "photorealistic, 3d, busy, cluttered, ornate, vintage, grunge, hand-drawn",
    "parameters": "{}",
    "owner": {
      "id": "user_team_admin",
      "username": "brandops",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_004_1",
        "type": "sample",
        "alt": "Minimalist Logo Generator sample 1",
        "url": "/demo-covers/prompt_004.svg"
      },
      {
        "id": "asset_prompt_004_2",
        "type": "sample",
        "alt": "Minimalist Logo Generator sample 2",
        "url": "/demo-covers/prompt_004.svg"
      },
      {
        "id": "asset_prompt_004_3",
        "type": "sample",
        "alt": "Minimalist Logo Generator sample 3",
        "url": "/demo-covers/prompt_004.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  },
  {
    "id": "prompt_005",
    "title": "Anime Girl School Uniform",
    "slug": "anime-girl-school-uniform",
    "summary": "Cute anime character in traditional Japanese school uniform style.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 0,
    "viewCount": 9823,
    "saveCount": 823,
    "content": "anime girl, school uniform, sailor fuku, pleated skirt, white blouse, red ribbon, long black hair, bright eyes, soft shading, studio ghibli style, vibrant colors, detailed background",
    "negativePrompt": "realistic, photorealistic, adult, mature, nsfw, ugly, deformed, extra limbs",
    "parameters": "{}",
    "owner": {
      "id": "user_member",
      "username": "promptmaker",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_005_1",
        "type": "sample",
        "alt": "Anime Girl School Uniform sample 1",
        "url": "/demo-covers/prompt_005.svg"
      },
      {
        "id": "asset_prompt_005_2",
        "type": "sample",
        "alt": "Anime Girl School Uniform sample 2",
        "url": "/demo-covers/prompt_005.svg"
      },
      {
        "id": "asset_prompt_005_3",
        "type": "sample",
        "alt": "Anime Girl School Uniform sample 3",
        "url": "/demo-covers/prompt_005.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  },
  {
    "id": "prompt_006",
    "title": "Luxury Perfume Ad Campaign",
    "slug": "luxury-perfume-ad-campaign",
    "summary": "High-end perfume advertising with dramatic lighting and elegant bottle.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 20,
    "viewCount": 1567,
    "saveCount": 89,
    "content": "luxury perfume advertisement, crystal bottle, golden liquid, dramatic spotlight, silk drapes, editorial fashion photography, Vogue style, 85mm lens bokeh, 8k ultra detailed",
    "negativePrompt": "cheap, discount, plastic, cluttered, busy background, cartoon, anime",
    "parameters": "{}",
    "owner": {
      "id": "user_creator",
      "username": "visualsmith",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_006_1",
        "type": "sample",
        "alt": "Luxury Perfume Ad Campaign sample 1",
        "url": "/demo-covers/prompt_006.svg"
      },
      {
        "id": "asset_prompt_006_2",
        "type": "sample",
        "alt": "Luxury Perfume Ad Campaign sample 2",
        "url": "/demo-covers/prompt_006.svg"
      },
      {
        "id": "asset_prompt_006_3",
        "type": "sample",
        "alt": "Luxury Perfume Ad Campaign sample 3",
        "url": "/demo-covers/prompt_006.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  },
  {
    "id": "prompt_007",
    "title": "Architectural Visualization Modern Villa",
    "slug": "architectural-visualization-modern-villa",
    "summary": "Contemporary architecture rendering with seamless glass and natural materials.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 0,
    "viewCount": 4532,
    "saveCount": 334,
    "content": "modern architectural visualization, contemporary villa, floor to ceiling glass windows, concrete and wood elements, infinity pool, landscaped gardens, golden hour lighting, architectural photography, real estate render",
    "negativePrompt": "interior decoration, furniture, people, cars, cluttered, ugly facade, outdated style",
    "parameters": "{}",
    "owner": {
      "id": "user_creator",
      "username": "visualsmith",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_007_1",
        "type": "sample",
        "alt": "Architectural Visualization Modern Villa sample 1",
        "url": "/demo-covers/prompt_007.svg"
      },
      {
        "id": "asset_prompt_007_2",
        "type": "sample",
        "alt": "Architectural Visualization Modern Villa sample 2",
        "url": "/demo-covers/prompt_007.svg"
      },
      {
        "id": "asset_prompt_007_3",
        "type": "sample",
        "alt": "Architectural Visualization Modern Villa sample 3",
        "url": "/demo-covers/prompt_007.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  },
  {
    "id": "prompt_008",
    "title": "Vintage Travel Poster",
    "slug": "vintage-travel-poster",
    "summary": "Retro travel poster style artwork with bold colors and Art Deco influences.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 0,
    "viewCount": 2341,
    "saveCount": 187,
    "content": "vintage travel poster, Art Deco style, tropical beach sunset, bold geometric shapes, limited color palette, WPA poster aesthetic, flat illustration, typography ready, 1930s travel advertisement",
    "negativePrompt": "photorealistic, 3d render, modern, minimalist, grunge, dirty, weathered",
    "parameters": "{}",
    "owner": {
      "id": "user_member",
      "username": "promptmaker",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_008_1",
        "type": "sample",
        "alt": "Vintage Travel Poster sample 1",
        "url": "/demo-covers/prompt_008.svg"
      },
      {
        "id": "asset_prompt_008_2",
        "type": "sample",
        "alt": "Vintage Travel Poster sample 2",
        "url": "/demo-covers/prompt_008.svg"
      },
      {
        "id": "asset_prompt_008_3",
        "type": "sample",
        "alt": "Vintage Travel Poster sample 3",
        "url": "/demo-covers/prompt_008.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  },
  {
    "id": "prompt_009",
    "title": "Sci-Fi Mech Warrior",
    "slug": "scifi-mech-warrior",
    "summary": "Massive combat mech with detailed mechanical design and battle damage.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 0,
    "viewCount": 3456,
    "saveCount": 298,
    "content": "giant combat mech robot, detailed mechanical parts, hydraulic pistons, battle damaged armor, dramatic sunset backdrop, concept art style, industrial sci-fi, blue and orange color scheme, hyper detailed",
    "negativePrompt": "cute, small robot, cartoon, anime, simple, low detail, blurry",
    "parameters": "{}",
    "owner": {
      "id": "user_creator",
      "username": "visualsmith",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_009_1",
        "type": "sample",
        "alt": "Sci-Fi Mech Warrior sample 1",
        "url": "/demo-covers/prompt_009.svg"
      },
      {
        "id": "asset_prompt_009_2",
        "type": "sample",
        "alt": "Sci-Fi Mech Warrior sample 2",
        "url": "/demo-covers/prompt_009.svg"
      },
      {
        "id": "asset_prompt_009_3",
        "type": "sample",
        "alt": "Sci-Fi Mech Warrior sample 3",
        "url": "/demo-covers/prompt_009.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  },
  {
    "id": "prompt_010",
    "title": "E-commerce Fashion Model",
    "slug": "ecommerce-fashion-model",
    "summary": "Full body fashion model shot ideal for online clothing stores.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 0,
    "viewCount": 6789,
    "saveCount": 556,
    "content": "fashion model full body shot, stylish outfit, studio lighting, e-commerce photography, clean white background, retail ready, fashion magazine style, natural pose, 85mm lens, detailed fabric texture",
    "negativePrompt": "nude, inappropriate, cartoon, anime, outdoor, location shoot, gritty",
    "parameters": "{}",
    "owner": {
      "id": "user_team_admin",
      "username": "brandops",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_010_1",
        "type": "sample",
        "alt": "E-commerce Fashion Model sample 1",
        "url": "/demo-covers/prompt_010.svg"
      },
      {
        "id": "asset_prompt_010_2",
        "type": "sample",
        "alt": "E-commerce Fashion Model sample 2",
        "url": "/demo-covers/prompt_010.svg"
      },
      {
        "id": "asset_prompt_010_3",
        "type": "sample",
        "alt": "E-commerce Fashion Model sample 3",
        "url": "/demo-covers/prompt_010.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  },
  {
    "id": "prompt_011",
    "title": "Dark Fantasy Demon Lord",
    "slug": "dark-fantasy-demon-lord",
    "summary": "Menacing dark lord character with demonic features and dark magic aura.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 25,
    "viewCount": 4567,
    "saveCount": 389,
    "content": "dark fantasy demon lord, horns, glowing red eyes, tattered cloak, dark magic aura, gothic armor, throne room backdrop, epic composition, dark souls inspired, hyper detailed digital art",
    "negativePrompt": "bright, cheerful, cute, cartoon, anime, disney, pastel colors, wholesome",
    "parameters": "{}",
    "owner": {
      "id": "user_creator",
      "username": "visualsmith",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_011_1",
        "type": "sample",
        "alt": "Dark Fantasy Demon Lord sample 1",
        "url": "/demo-covers/prompt_011.svg"
      },
      {
        "id": "asset_prompt_011_2",
        "type": "sample",
        "alt": "Dark Fantasy Demon Lord sample 2",
        "url": "/demo-covers/prompt_011.svg"
      },
      {
        "id": "asset_prompt_011_3",
        "type": "sample",
        "alt": "Dark Fantasy Demon Lord sample 3",
        "url": "/demo-covers/prompt_011.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  },
  {
    "id": "prompt_012",
    "title": "Watercolor Landscape Scenery",
    "slug": "watercolor-landscape-scenery",
    "summary": "Beautiful watercolor landscape with rolling hills and sunset sky.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 0,
    "viewCount": 1890,
    "saveCount": 156,
    "content": "watercolor landscape painting, rolling green hills, dramatic sunset sky, loose brushstrokes, soft color bleeding, paper texture visible, impressionistic style, peaceful countryside, traditional watercolor on cold press paper",
    "negativePrompt": "digital art, 3d render, photorealistic, sharp edges, tight rendering, geometric",
    "parameters": "{}",
    "owner": {
      "id": "user_member",
      "username": "promptmaker",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_012_1",
        "type": "sample",
        "alt": "Watercolor Landscape Scenery sample 1",
        "url": "/demo-covers/prompt_012.svg"
      },
      {
        "id": "asset_prompt_012_2",
        "type": "sample",
        "alt": "Watercolor Landscape Scenery sample 2",
        "url": "/demo-covers/prompt_012.svg"
      },
      {
        "id": "asset_prompt_012_3",
        "type": "sample",
        "alt": "Watercolor Landscape Scenery sample 3",
        "url": "/demo-covers/prompt_012.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  },
  {
    "id": "prompt_013",
    "title": "Social Media Icon Pack",
    "slug": "social-media-icon-pack",
    "summary": "Modern social media icons with consistent style and vibrant gradients.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 10,
    "viewCount": 8901,
    "saveCount": 723,
    "content": "social media icon pack, consistent style guide, vibrant gradients, rounded corners, flat design, vector ready, app icon style, modern UI, cohesive color palette, 1024x1024",
    "negativePrompt": "realistic, photograph, detailed, complex, grunge, hand-drawn, sketch",
    "parameters": "{}",
    "owner": {
      "id": "user_creator",
      "username": "visualsmith",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_013_1",
        "type": "sample",
        "alt": "Social Media Icon Pack sample 1",
        "url": "/demo-covers/prompt_013.svg"
      },
      {
        "id": "asset_prompt_013_2",
        "type": "sample",
        "alt": "Social Media Icon Pack sample 2",
        "url": "/demo-covers/prompt_013.svg"
      },
      {
        "id": "asset_prompt_013_3",
        "type": "sample",
        "alt": "Social Media Icon Pack sample 3",
        "url": "/demo-covers/prompt_013.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  },
  {
    "id": "prompt_014",
    "title": "Portrait Oil Painting Style",
    "slug": "portrait-oil-painting-style",
    "summary": "Classical oil painting style portrait with dramatic chiaroscuro lighting.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 0,
    "viewCount": 2345,
    "saveCount": 201,
    "content": "classical oil painting portrait, Rembrandt lighting, dramatic chiaroscuro, rich dark background, thick impasto brushstrokes, realistic yet painterly, museum quality, 17th century master style",
    "negativePrompt": "digital art, modern, cartoon, anime, flat, illustration, sketch, minimalist",
    "parameters": "{}",
    "owner": {
      "id": "user_team_admin",
      "username": "brandops",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_014_1",
        "type": "sample",
        "alt": "Portrait Oil Painting Style sample 1",
        "url": "/demo-covers/prompt_014.svg"
      },
      {
        "id": "asset_prompt_014_2",
        "type": "sample",
        "alt": "Portrait Oil Painting Style sample 2",
        "url": "/demo-covers/prompt_014.svg"
      },
      {
        "id": "asset_prompt_014_3",
        "type": "sample",
        "alt": "Portrait Oil Painting Style sample 3",
        "url": "/demo-covers/prompt_014.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  },
  {
    "id": "prompt_015",
    "title": "Isometric Game Asset City",
    "slug": "isometric-game-asset-city",
    "summary": "Cute isometric city buildings perfect for indie game development.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 0,
    "viewCount": 3456,
    "saveCount": 289,
    "content": "isometric game asset, cute city buildings, low poly style, pastel colors, consistent tile size, game ready, Unity Unreal engine friendly, morning sunlight, detailed facades, charming aesthetic",
    "negativePrompt": "realistic, photorealistic, high poly, complex, dark theme, gritty",
    "parameters": "{}",
    "owner": {
      "id": "user_creator",
      "username": "visualsmith",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_015_1",
        "type": "sample",
        "alt": "Isometric Game Asset City sample 1",
        "url": "/demo-covers/prompt_015.svg"
      },
      {
        "id": "asset_prompt_015_2",
        "type": "sample",
        "alt": "Isometric Game Asset City sample 2",
        "url": "/demo-covers/prompt_015.svg"
      },
      {
        "id": "asset_prompt_015_3",
        "type": "sample",
        "alt": "Isometric Game Asset City sample 3",
        "url": "/demo-covers/prompt_015.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  },
  {
    "id": "prompt_016",
    "title": "Nature Wildlife Photography",
    "slug": "nature-wildlife-photography",
    "summary": "Stunning wildlife photo of eagle in natural mountain habitat.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 0,
    "viewCount": 4567,
    "saveCount": 378,
    "content": "wildlife photography, bald eagle perched on pine branch, mountain wilderness backdrop, golden hour light,Canon EOS R5, 400mm lens, sharp feather detail, natural habitat, national geographic style",
    "negativePrompt": "zoo, captive, cage, artificial, cartoon, anime, illustration, painting",
    "parameters": "{}",
    "owner": {
      "id": "user_member",
      "username": "promptmaker",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_016_1",
        "type": "sample",
        "alt": "Nature Wildlife Photography sample 1",
        "url": "/demo-covers/prompt_016.svg"
      },
      {
        "id": "asset_prompt_016_2",
        "type": "sample",
        "alt": "Nature Wildlife Photography sample 2",
        "url": "/demo-covers/prompt_016.svg"
      },
      {
        "id": "asset_prompt_016_3",
        "type": "sample",
        "alt": "Nature Wildlife Photography sample 3",
        "url": "/demo-covers/prompt_016.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  },
  {
    "id": "prompt_017",
    "title": "Futuristic UI Dashboard",
    "slug": "futuristic-ui-dashboard",
    "summary": "Sleek sci-fi UI design for software dashboard and data visualization.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 0,
    "viewCount": 5678,
    "saveCount": 445,
    "content": "futuristic UI design, holographic interface, dark theme, neon accent lights, data visualization panels, sci-fi control room, unreal engine quality, sleek and modern, floating UI elements",
    "negativePrompt": "retro, vintage, skeuomorphic, flat 2d, ms-dos style, windows 95, busy cluttered",
    "parameters": "{}",
    "owner": {
      "id": "user_creator",
      "username": "visualsmith",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_017_1",
        "type": "sample",
        "alt": "Futuristic UI Dashboard sample 1",
        "url": "/demo-covers/prompt_017.svg"
      },
      {
        "id": "asset_prompt_017_2",
        "type": "sample",
        "alt": "Futuristic UI Dashboard sample 2",
        "url": "/demo-covers/prompt_017.svg"
      },
      {
        "id": "asset_prompt_017_3",
        "type": "sample",
        "alt": "Futuristic UI Dashboard sample 3",
        "url": "/demo-covers/prompt_017.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  },
  {
    "id": "prompt_018",
    "title": "Steampunk Inventor Character",
    "slug": "steampunk-inventor-character",
    "summary": "Victorian-era inventor with brass mechanical contraptions and goggles.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 0,
    "viewCount": 2789,
    "saveCount": 223,
    "content": "steampunk inventor character, Victorian era, brass mechanical arm, safety goggles, leather apron, steam-powered gadgets, clockwork mechanisms, sepia tones, adventure time style",
    "negativePrompt": "modern, futuristic, sci-fi, cyberpunk, anime, cartoon, simple, low detail",
    "parameters": "{}",
    "owner": {
      "id": "user_team_admin",
      "username": "brandops",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_018_1",
        "type": "sample",
        "alt": "Steampunk Inventor Character sample 1",
        "url": "/demo-covers/prompt_018.svg"
      },
      {
        "id": "asset_prompt_018_2",
        "type": "sample",
        "alt": "Steampunk Inventor Character sample 2",
        "url": "/demo-covers/prompt_018.svg"
      },
      {
        "id": "asset_prompt_018_3",
        "type": "sample",
        "alt": "Steampunk Inventor Character sample 3",
        "url": "/demo-covers/prompt_018.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  },
  {
    "id": "prompt_019",
    "title": "Abstract Fluid Art Background",
    "slug": "abstract-fluid-art-background",
    "summary": "Colorful abstract fluid art perfect for backgrounds and merch printing.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 0,
    "viewCount": 8901,
    "saveCount": 667,
    "content": "abstract fluid art, pouring technique, vibrant rainbow colors, flowing organic shapes, resin art style, high saturation, 4k print ready, modern abstract background, colorful chaos",
    "negativePrompt": "geometric, precise, lines, drawings, illustration, cartoon, anime, minimalist",
    "parameters": "{}",
    "owner": {
      "id": "user_creator",
      "username": "visualsmith",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_019_1",
        "type": "sample",
        "alt": "Abstract Fluid Art Background sample 1",
        "url": "/demo-covers/prompt_019.svg"
      },
      {
        "id": "asset_prompt_019_2",
        "type": "sample",
        "alt": "Abstract Fluid Art Background sample 2",
        "url": "/demo-covers/prompt_019.svg"
      },
      {
        "id": "asset_prompt_019_3",
        "type": "sample",
        "alt": "Abstract Fluid Art Background sample 3",
        "url": "/demo-covers/prompt_019.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  },
  {
    "id": "prompt_020",
    "title": "Horror Game Environment Dark Corridor",
    "slug": "horror-game-environment-dark-corridor",
    "summary": "Atmospheric horror game level design with flickering lights and decay.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 0,
    "viewCount": 3456,
    "saveCount": 278,
    "content": "horror game environment, dark abandoned corridor, flickering fluorescent lights, peeling wallpaper, eerie atmosphere, dead end, unsettling ambiance, resident evil style, volumetric dust particles",
    "negativePrompt": "bright, sunny, cheerful, colorful, cartoon, anime, friendly, safe, cozy",
    "parameters": "{}",
    "owner": {
      "id": "user_member",
      "username": "promptmaker",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_020_1",
        "type": "sample",
        "alt": "Horror Game Environment Dark Corridor sample 1",
        "url": "/demo-covers/prompt_020.svg"
      },
      {
        "id": "asset_prompt_020_2",
        "type": "sample",
        "alt": "Horror Game Environment Dark Corridor sample 2",
        "url": "/demo-covers/prompt_020.svg"
      },
      {
        "id": "asset_prompt_020_3",
        "type": "sample",
        "alt": "Horror Game Environment Dark Corridor sample 3",
        "url": "/demo-covers/prompt_020.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  },
  {
    "id": "prompt_021",
    "title": "Children Book Illustration Forest",
    "slug": "children-book-illustration-forest",
    "summary": "Whimsical forest scene for children picture book with friendly animals.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 0,
    "viewCount": 4567,
    "saveCount": 389,
    "content": "children book illustration, whimsical forest scene, friendly rabbit and fox, magical glowing mushrooms, soft pastel colors, storybook style, hand-painted texture, gentle lighting, perfect for ages 3-6",
    "negativePrompt": "realistic, photorealistic, scary, dark, horror, violent, complex, adult themes",
    "parameters": "{}",
    "owner": {
      "id": "user_creator",
      "username": "visualsmith",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_021_1",
        "type": "sample",
        "alt": "Children Book Illustration Forest sample 1",
        "url": "/demo-covers/prompt_021.svg"
      },
      {
        "id": "asset_prompt_021_2",
        "type": "sample",
        "alt": "Children Book Illustration Forest sample 2",
        "url": "/demo-covers/prompt_021.svg"
      },
      {
        "id": "asset_prompt_021_3",
        "type": "sample",
        "alt": "Children Book Illustration Forest sample 3",
        "url": "/demo-covers/prompt_021.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  },
  {
    "id": "prompt_022",
    "title": "Car Commercial Photography",
    "slug": "car-commercial-photography",
    "summary": "High-end sports car editorial shot with dramatic studio lighting.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 30,
    "viewCount": 2345,
    "saveCount": 156,
    "content": "high-end sports car editorial photography, dramatic studio lighting, reflective floor, sleek silhouette, automotive commercial, motor trend magazine style, dramatic shadows, studio backdrop",
    "negativePrompt": "outdoor, location, dirty, wrecked, damaged, cartoon, anime, illustration",
    "parameters": "{}",
    "owner": {
      "id": "user_team_admin",
      "username": "brandops",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_022_1",
        "type": "sample",
        "alt": "Car Commercial Photography sample 1",
        "url": "/demo-covers/prompt_022.svg"
      },
      {
        "id": "asset_prompt_022_2",
        "type": "sample",
        "alt": "Car Commercial Photography sample 2",
        "url": "/demo-covers/prompt_022.svg"
      },
      {
        "id": "asset_prompt_022_3",
        "type": "sample",
        "alt": "Car Commercial Photography sample 3",
        "url": "/demo-covers/prompt_022.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  },
  {
    "id": "prompt_023",
    "title": "Pixel Art Retro Game Scene",
    "slug": "pixel-art-retro-game-scene",
    "summary": "16-bit style pixel art game scene with parallax scrolling layers.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 0,
    "viewCount": 5678,
    "saveCount": 478,
    "content": "16-bit pixel art game scene, parallax scrolling layers, vibrant colors, snes era style, scrolling platformer background, detailed pixel by pixel, retro gaming aesthetic, nostalgic gaming scene",
    "negativePrompt": "3d, realistic, photorealistic, modern ui, flat design, vector, high poly",
    "parameters": "{}",
    "owner": {
      "id": "user_creator",
      "username": "visualsmith",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_023_1",
        "type": "sample",
        "alt": "Pixel Art Retro Game Scene sample 1",
        "url": "/demo-covers/prompt_023.svg"
      },
      {
        "id": "asset_prompt_023_2",
        "type": "sample",
        "alt": "Pixel Art Retro Game Scene sample 2",
        "url": "/demo-covers/prompt_023.svg"
      },
      {
        "id": "asset_prompt_023_3",
        "type": "sample",
        "alt": "Pixel Art Retro Game Scene sample 3",
        "url": "/demo-covers/prompt_023.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  },
  {
    "id": "prompt_024",
    "title": "Cosmic Space Nebula",
    "slug": "cosmic-space-nebula",
    "summary": "Breathtaking deep space nebula with vibrant colors and star formation.",
    "engine": "stable-diffusion",
    "model": "sd-xl",
    "status": "published",
    "priceCredits": 0,
    "viewCount": 7890,
    "saveCount": 623,
    "content": "cosmic space nebula,Hubble telescope quality, vibrant purple and orange gases, star formation regions, stellar nursery, deep space astrophotography, cosmic dust clouds, 8k ultra hd space imagery",
    "negativePrompt": "earth, planets, moons, spacecraft, astronauts, cartoon, anime, illustration",
    "parameters": "{}",
    "owner": {
      "id": "user_member",
      "username": "promptmaker",
      "avatarUrl": null
    },
    "assets": [
      {
        "id": "asset_prompt_024_1",
        "type": "sample",
        "alt": "Cosmic Space Nebula sample 1",
        "url": "/demo-covers/prompt_024.svg"
      },
      {
        "id": "asset_prompt_024_2",
        "type": "sample",
        "alt": "Cosmic Space Nebula sample 2",
        "url": "/demo-covers/prompt_024.svg"
      },
      {
        "id": "asset_prompt_024_3",
        "type": "sample",
        "alt": "Cosmic Space Nebula sample 3",
        "url": "/demo-covers/prompt_024.svg"
      }
    ],
    "promptTags": [],
    "marketplaceItem": null,
    "reviews": []
  }
];

export const previewMarketplaceItems = previewPrompts.map((prompt, index) => ({
  id: `market-${prompt.id}`,
  prompt,
  seller: prompt.owner,
  priceCredits: prompt.priceCredits || 6 + index * 3,
  ratingAvg: 4.6 + (index % 4) * 0.1,
  salesCount: 80 + index * 42,
  license: index === 0 ? 'free' : 'commercial',
}));

export function getPreviewPromptById(id: string) {
  return previewPrompts.find((prompt) => prompt.id === id || prompt.slug === id) ?? null;
}
