import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, Building, Users, TrendingUp, CheckCircle, ArrowRight, User } from "lucide-react";
import { Link } from "wouter";
import logoPath from "@assets/SmartRate - Colors.png";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center mb-8">
          <img src={logoPath} alt="SmartRate" className="h-16 w-auto" />
        </div>
        
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            Scegli il Calcolatore Fiscale
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            Trova la soluzione fiscale più conveniente per la tua attività. 
            Confronta regime forfettario, regime ordinario e SRL per ottimizzare le tue tasse.
          </p>
        </div>

        {/* Calculators Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          
          {/* Regime Forfettario */}
          <Card className="hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-300">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calculator className="h-10 w-10 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Regime Forfettario
                </h2>
                <p className="text-gray-600">
                  Perfetto per freelance e piccole attività
                </p>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Tasse dal 5% al 15%</span>
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Limite fatturato 85.000€</span>
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Gestione semplificata</span>
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Scadenze fiscali e INPS</span>
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Piano di risparmio automatico</span>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">5%-15%</div>
                  <div className="text-sm text-blue-700">Tassazione agevolata</div>
                </div>
              </div>

              <Link href="/calculator">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 py-3 text-lg">
                  <Calculator className="mr-2 h-5 w-5" />
                  Calcola Regime Forfettario
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Ditte Individuali Regime Ordinario */}
          <Card className="hover:shadow-xl transition-all duration-300 border-2 hover:border-green-300">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Regime Ordinario
                </h2>
                <p className="text-gray-600">
                  Per professionisti e imprese individuali
                </p>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>IRPEF 23%-43%</span>
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Nessun limite di fatturato</span>
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Spese completamente deducibili</span>
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Contributi previdenziali</span>
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Pianificazione acconti</span>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">23%-43%</div>
                  <div className="text-sm text-green-700">IRPEF + Addizionali</div>
                </div>
              </div>

              <Link href="/calculator-individual">
                <Button className="w-full bg-green-600 hover:bg-green-700 py-3 text-lg">
                  <User className="mr-2 h-5 w-5" />
                  Calcola Regime Ordinario
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* SRL */}
          <Card className="hover:shadow-xl transition-all duration-300 border-2 hover:border-purple-300">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building className="h-10 w-10 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  SRL Semplificata
                </h2>
                <p className="text-gray-600">
                  Ideale per attività in crescita
                </p>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>IRES 24% + IRAP 3.9%</span>
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Nessun limite di fatturato</span>
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Deducibilità maggiore</span>
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Crescita scalabile</span>
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Protezione patrimoniale</span>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">~28%</div>
                  <div className="text-sm text-purple-700">Tassazione sui profitti</div>
                </div>
              </div>

              <Link href="/calculator-srl">
                <Button className="w-full bg-purple-600 hover:bg-purple-700 py-3 text-lg">
                  <Building className="mr-2 h-5 w-5" />
                  Calcola SRL
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Comparison Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Non sai quale scegliere?
                </h3>
                <p className="text-gray-600">
                  Ecco alcuni criteri per orientarti nella scelta del regime fiscale più adatto
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-blue-100 p-4 rounded-lg mb-4">
                    <Calculator className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h4 className="font-semibold text-blue-900">Scegli Forfettario se:</h4>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Fatturi meno di 85.000€/anno</li>
                    <li>• Lavori principalmente da solo</li>
                    <li>• Vuoi gestione semplificata</li>
                    <li>• Preferisci meno burocrazia</li>
                    <li>• Hai poche spese deducibili</li>
                  </ul>
                </div>

                <div className="text-center">
                  <div className="bg-green-100 p-4 rounded-lg mb-4">
                    <User className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <h4 className="font-semibold text-green-900">Scegli Ordinario se:</h4>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Superi i limiti del forfettario</li>
                    <li>• Hai molte spese documentate</li>
                    <li>• Vuoi flessibilità contabile</li>
                    <li>• Fatturi oltre 85.000€/anno</li>
                    <li>• Gestisci IVA complessa</li>
                  </ul>
                </div>

                <div className="text-center">
                  <div className="bg-purple-100 p-4 rounded-lg mb-4">
                    <Building className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <h4 className="font-semibold text-purple-900">Scegli SRL se:</h4>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Prevedi crescita rapida</li>
                    <li>• Vuoi protezione patrimoniale</li>
                    <li>• Hai soci o investitori</li>
                    <li>• Fatturi oltre 200.000€/anno</li>
                    <li>• Reinvesti utili nell'azienda</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>Powered by SmartRate - Consulenza fiscale per professionisti</p>
        </div>
      </div>
    </div>
  );
}