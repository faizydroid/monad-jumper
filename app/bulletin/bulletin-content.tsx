import { useSearchParams } from 'next/navigation';

export default function BulletinContent() {
  const searchParams = useSearchParams();
  
  return (
    <div className="bulletin-container">
      {/* Your bulletin page content */}
      <h1>Bulletin Board</h1>
      {/* Add your bulletin content here */}
    </div>
  );
} 